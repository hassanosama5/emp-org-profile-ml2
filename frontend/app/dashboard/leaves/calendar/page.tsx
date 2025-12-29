"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { policyConfigApi } from "@/lib/api/time-management/policy-config.api";
import { Calendar, CreateCalendarDto, Holiday, BlockedPeriod } from "@/types/leaves";
import { HolidayType } from "@/types/time-management";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Input } from "@/components/shared/ui/Input";
import { Textarea } from "@/components/leaves/Textarea";
import { Modal } from "@/components/leaves/Modal";
import { Toast, useToast } from "@/components/leaves/Toast";

export default function CalendarPage() {
  const { user } = useAuth();
  useRequireAuth(SystemRole.HR_ADMIN);
  const { toast, showToast, hideToast } = useToast();

  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [systemHolidays, setSystemHolidays] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isBlockedModalOpen, setIsBlockedModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateCalendarDto>({
    year: new Date().getFullYear(),
    holidays: [],
    blockedPeriods: [],
  });
  const [holidayForm, setHolidayForm] = useState<Holiday>({
    name: "",
    date: "",
    description: "",
  });
  const [blockedForm, setBlockedForm] = useState<BlockedPeriod>({
    from: "",
    to: "",
    reason: "",
  });

  useEffect(() => {
    loadCalendar();
    loadSystemHolidays();
  }, [year]);

  const loadSystemHolidays = async () => {
    try {
      setLoadingHolidays(true);
      // Fetch national and organizational holidays for the selected year
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      
      const [nationalHolidays, orgHolidays] = await Promise.all([
        policyConfigApi.getHolidays({
          type: HolidayType.NATIONAL,
          startDate: startOfYear.toISOString().split('T')[0],
          active: true,
        }),
        policyConfigApi.getHolidays({
          type: HolidayType.ORGANIZATIONAL,
          startDate: startOfYear.toISOString().split('T')[0],
          active: true,
        }),
      ]);
      
      // Combine and filter by year
      const allHolidays = [...(nationalHolidays || []), ...(orgHolidays || [])];
      const yearHolidays = allHolidays.filter((h: any) => {
        const holidayDate = new Date(h.startDate);
        return holidayDate.getFullYear() === year && h.active !== false;
      });
      
      setSystemHolidays(yearHolidays);
    } catch (error: any) {
      console.error("Failed to load system holidays:", error);
      // Don't show error toast - just log it, as this is supplementary data
      setSystemHolidays([]);
    } finally {
      setLoadingHolidays(false);
    }
  };

  const loadCalendar = async () => {
    try {
      setLoading(true);
      const data = await leavesApi.getCalendarByYear(year);
      if (data) {
        // Backend returns holidays as populated Holiday documents from time-management
        // Holiday structure: { _id, type, startDate, endDate, name, active }
        // We need to map to: { name, date, description }
        const holidays = Array.isArray(data.holidays) 
          ? data.holidays.map((h: any) => {
              // If it's a string/ID (not populated), skip it
              if (typeof h === 'string' || !h || !h._id) {
                return null;
              }
              
              // If it's a populated Holiday document from time-management
              // It has: _id, type, startDate, endDate, name (optional), active
              if (h.startDate) {
                return {
                  name: h.name || 'Holiday',
                  date: new Date(h.startDate).toISOString().split('T')[0], // Convert Date to YYYY-MM-DD
                  description: '', // Holiday model doesn't have description
                };
              }
              
              // If it's already in our format { name, date, description }
              if (h.date && h.name) {
                return h;
              }
              
              return null;
            }).filter((h: any) => h !== null)
          : [];
        
        // Map blocked periods to ensure dates are strings in YYYY-MM-DD format
        const blockedPeriods = Array.isArray(data.blockedPeriods)
          ? data.blockedPeriods.map((bp: any) => ({
              from: typeof bp.from === 'string' 
                ? bp.from 
                : new Date(bp.from).toISOString().split('T')[0],
              to: typeof bp.to === 'string' 
                ? bp.to 
                : new Date(bp.to).toISOString().split('T')[0],
              reason: bp.reason || '',
            }))
          : [];
        
        setCalendar({
          ...data,
          holidays: holidays,
          blockedPeriods: blockedPeriods,
        });
        setFormData({
          year: data.year,
          holidays: holidays,
          blockedPeriods: blockedPeriods,
        });
      } else {
        setCalendar(null);
        setFormData({
          year,
          holidays: [],
          blockedPeriods: [],
        });
      }
    } catch (error: any) {
      showToast(error.message || "Failed to load calendar", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsModalOpen(true);
  };

  const handleOpenHoliday = () => {
    setHolidayForm({ name: "", date: "", description: "" });
    setIsHolidayModalOpen(true);
  };

  const handleOpenBlocked = () => {
    setBlockedForm({ from: "", to: "", reason: "" });
    setIsBlockedModalOpen(true);
  };

  const saveCalendarData = async (updatedFormData: CreateCalendarDto) => {
    try {
      let savedCalendar: Calendar;
      if (calendar) {
        savedCalendar = await leavesApi.updateCalendar(year, updatedFormData);
      } else {
        savedCalendar = await leavesApi.createCalendar(updatedFormData);
      }
      
      // Update calendar state with saved data (to match formData structure)
      setCalendar({
        ...savedCalendar,
        holidays: updatedFormData.holidays || [],
        blockedPeriods: updatedFormData.blockedPeriods || [],
      });
      
      // Also update formData to keep them in sync
      setFormData(updatedFormData);
      
      return true;
    } catch (error: any) {
      showToast(error.message || "Failed to save calendar", "error");
      return false;
    }
  };

  const handleAddHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date) {
      showToast("Name and date are required", "error");
      return;
    }
    
    const updatedFormData = {
      ...formData,
      holidays: [...(formData.holidays || []), { ...holidayForm }],
    };
    
    // Update formData immediately for UI
    setFormData(updatedFormData);
    setIsHolidayModalOpen(false);
    setHolidayForm({ name: "", date: "", description: "" });
    
    // Save to backend immediately
    const success = await saveCalendarData(updatedFormData);
    if (success) {
      showToast("Holiday added successfully", "success");
    }
  };

  const handleAddBlockedPeriod = async () => {
    if (!blockedForm.from || !blockedForm.to) {
      showToast("From and To dates are required", "error");
      return;
    }
    
    const updatedFormData = {
      ...formData,
      blockedPeriods: [...(formData.blockedPeriods || []), { ...blockedForm }],
    };
    
    // Update formData immediately for UI
    setFormData(updatedFormData);
    setIsBlockedModalOpen(false);
    setBlockedForm({ from: "", to: "", reason: "" });
    
    // Save to backend immediately
    const success = await saveCalendarData(updatedFormData);
    if (success) {
      showToast("Blocked period added successfully", "success");
    }
  };

  const handleRemoveHoliday = async (index: number) => {
    const newHolidays = [...(formData.holidays || [])];
    newHolidays.splice(index, 1);
    const updatedFormData = { ...formData, holidays: newHolidays };
    
    // Update formData immediately for UI
    setFormData(updatedFormData);
    
    // Save to backend immediately
    const success = await saveCalendarData(updatedFormData);
    if (success) {
      showToast("Holiday removed successfully", "success");
    }
  };

  const handleRemoveBlockedPeriod = async (index: number) => {
    const newBlocked = [...(formData.blockedPeriods || [])];
    newBlocked.splice(index, 1);
    const updatedFormData = { ...formData, blockedPeriods: newBlocked };
    
    // Update formData immediately for UI
    setFormData(updatedFormData);
    
    // Save to backend immediately
    const success = await saveCalendarData(updatedFormData);
    if (success) {
      showToast("Blocked period removed successfully", "success");
    }
  };

  const handleSave = async () => {
    try {
      if (calendar) {
        await leavesApi.updateCalendar(year, formData);
        showToast("Calendar updated successfully", "success");
      } else {
        await leavesApi.createCalendar(formData);
        showToast("Calendar created successfully", "success");
      }
      setIsModalOpen(false);
      loadCalendar();
    } catch (error: any) {
      showToast(error.message || "Failed to save calendar", "error");
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">Calendar & Blocked Days</h1>
            <p className="text-gray-600 mt-1">
              Configure holidays and blocked periods
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            className="w-32 border-2 border-rose-200 focus:border-rose-400 rounded-lg"
            placeholder="Year"
          />
          <Button 
            onClick={loadCalendar}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Load Calendar
          </Button>
          <Button 
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {calendar ? "Edit Calendar" : "Create Calendar"}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full mb-4 animate-pulse">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-rose-700 font-semibold text-lg">Loading calendar...</p>
          </CardContent>
        </Card>
      ) : calendar ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
            <CardHeader className="bg-gradient-to-r from-rose-500 to-pink-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <CardTitle className="text-white text-xl">Holidays ({calendar.year})</CardTitle>
                </div>
                <Button 
                  size="sm" 
                  onClick={handleOpenHoliday}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-all duration-200 border-2 border-white/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Holiday
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* System Holidays (National & Organizational) */}
              {loadingHolidays ? (
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full mb-2 animate-pulse">
                    <svg className="w-4 h-4 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <p className="text-gray-600 text-sm font-medium">Loading system holidays...</p>
                </div>
              ) : systemHolidays.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">System Holidays</h4>
                  <div className="space-y-2">
                    {systemHolidays.map((holiday: any, index: number) => {
                      const holidayDate = new Date(holiday.startDate);
                      const endDate = holiday.endDate ? new Date(holiday.endDate) : null;
                      const isRange = endDate && endDate.getTime() !== holidayDate.getTime();
                      
                      return (
                        <div
                          key={`system-${holiday._id || index}`}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <p className="font-bold text-blue-900">{holiday.name || 'Holiday'}</p>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                holiday.type === HolidayType.NATIONAL 
                                  ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200' 
                                  : 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200'
                              }`}>
                                {holiday.type === HolidayType.NATIONAL ? 'National' : 'Organizational'}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-blue-700 ml-7">
                              {isRange 
                                ? `${holidayDate.toLocaleDateString()} - ${endDate?.toLocaleDateString()}`
                                : holidayDate.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Calendar Holidays (Manual entries) */}
              {Array.isArray(calendar.holidays) && calendar.holidays.length > 0 ? (
                <div className={systemHolidays.length > 0 ? "mt-4" : ""}>
                  {systemHolidays.length > 0 && (
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Manual Holidays</h4>
                  )}
                  <div className="space-y-2">
                    {calendar.holidays.map((holiday, index) => {
                      // Holiday should already be in format { name, date, description } from loadCalendar
                      if (!holiday || typeof holiday !== 'object') return null;
                      const h = holiday as { name: string; date: string; description?: string };
                      return (
                        <div
                          key={`manual-${index}`}
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-gradient-to-br from-gray-400 to-slate-500 rounded-lg">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{h.name || 'Holiday'}</p>
                              {h.date && (
                                <p className="text-sm font-medium text-gray-600">
                                  {new Date(h.date).toLocaleDateString()}
                                </p>
                              )}
                              {h.description && (
                                <p className="text-sm text-gray-500 mt-1">{h.description}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveHoliday(index)}
                            className="border-red-300 text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 hover:border-red-400 transition-all duration-200"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : systemHolidays.length === 0 && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full mb-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">No holidays configured</p>
                </div>
              )}
              
              {systemHolidays.length === 0 && (!calendar.holidays || calendar.holidays.length === 0) && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full mb-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">No holidays configured</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <CardTitle className="text-white text-xl">Blocked Periods ({calendar.year})</CardTitle>
                </div>
                <Button 
                  size="sm" 
                  onClick={handleOpenBlocked}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-lg transition-all duration-200 border-2 border-white/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Blocked Period
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {calendar.blockedPeriods && calendar.blockedPeriods.length > 0 ? (
                <div className="space-y-3">
                  {calendar.blockedPeriods.map((period, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-2 border-orange-200 hover:border-orange-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold text-orange-900">
                            {new Date(period.from).toLocaleDateString()} -{" "}
                            {new Date(period.to).toLocaleDateString()}
                          </p>
                          {period.reason && (
                            <p className="text-sm text-orange-700 mt-1">{period.reason}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveBlockedPeriod(index)}
                        className="border-red-300 text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 hover:border-red-400 transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full mb-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">No blocked periods configured</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-700 font-medium text-lg mb-2">
              No calendar found for {year}
            </p>
            <p className="text-gray-500 mb-6">
              Create a new calendar to get started.
            </p>
            <Button 
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Calendar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Calendar Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={calendar ? "Edit Calendar" : "Create Calendar"}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </>
        }
      >
        <div className="space-y-6">
          <Input
            label="Year"
            type="number"
            value={formData.year}
            onChange={(e) =>
              setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })
            }
          />

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Holidays</h3>
              <Button size="sm" onClick={handleOpenHoliday}>
                Add Holiday
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {formData.holidays?.map((holiday, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{holiday.name}</p>
                    {holiday.date && (
                      <p className="text-sm text-gray-600">
                        {new Date(holiday.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveHoliday(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Blocked Periods</h3>
              <Button size="sm" onClick={handleOpenBlocked}>
                Add Blocked Period
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {formData.blockedPeriods?.map((period, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(period.from).toLocaleDateString()} -{" "}
                      {new Date(period.to).toLocaleDateString()}
                    </p>
                    {period.reason && (
                      <p className="text-sm text-gray-500">{period.reason}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveBlockedPeriod(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Holiday Modal */}
      <Modal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="Add Holiday"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsHolidayModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddHoliday}>Add</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Holiday Name *"
            value={holidayForm.name}
            onChange={(e) =>
              setHolidayForm({ ...holidayForm, name: e.target.value })
            }
            placeholder="e.g., New Year's Day"
          />
          <Input
            label="Date *"
            type="date"
            value={holidayForm.date}
            onChange={(e) =>
              setHolidayForm({ ...holidayForm, date: e.target.value })
            }
          />
          <Textarea
            label="Description"
            value={holidayForm.description}
            onChange={(e) =>
              setHolidayForm({ ...holidayForm, description: e.target.value })
            }
            rows={2}
            placeholder="Optional description"
          />
        </div>
      </Modal>

      {/* Add Blocked Period Modal */}
      <Modal
        isOpen={isBlockedModalOpen}
        onClose={() => setIsBlockedModalOpen(false)}
        title="Add Blocked Period"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsBlockedModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBlockedPeriod}>Add</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="From Date *"
            type="date"
            value={blockedForm.from}
            onChange={(e) =>
              setBlockedForm({ ...blockedForm, from: e.target.value })
            }
          />
          <Input
            label="To Date *"
            type="date"
            value={blockedForm.to}
            onChange={(e) =>
              setBlockedForm({ ...blockedForm, to: e.target.value })
            }
          />
          <Textarea
            label="Reason"
            value={blockedForm.reason}
            onChange={(e) =>
              setBlockedForm({ ...blockedForm, reason: e.target.value })
            }
            rows={2}
            placeholder="Reason for blocking this period"
          />
        </div>
      </Modal>
    </div>
  );
}

