"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRequireAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { leavesApi } from "@/lib/api/leaves/leaves";
import { Calendar, CreateCalendarDto, Holiday, BlockedPeriod } from "@/types/leaves";
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
  }, [year]);

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

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar & Blocked Days</h1>
          <p className="text-gray-600 mt-1">
            Configure holidays and blocked periods
          </p>
        </div>
        <div className="flex gap-3">
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            className="w-32"
            placeholder="Year"
          />
          <Button onClick={loadCalendar}>Load Calendar</Button>
          <Button onClick={handleOpenCreate}>
            {calendar ? "Edit Calendar" : "Create Calendar"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : calendar ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Holidays ({calendar.year})</CardTitle>
                <Button size="sm" onClick={handleOpenHoliday}>
                  Add Holiday
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {Array.isArray(calendar.holidays) && calendar.holidays.length > 0 ? (
                <div className="space-y-2">
                  {calendar.holidays.map((holiday, index) => {
                    // Holiday should already be in format { name, date, description } from loadCalendar
                    if (!holiday || typeof holiday !== 'object') return null;
                    const h = holiday as { name: string; date: string; description?: string };
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{h.name || 'Holiday'}</p>
                          {h.date && (
                            <p className="text-sm text-gray-600">
                              {new Date(h.date).toLocaleDateString()}
                            </p>
                          )}
                          {h.description && (
                            <p className="text-sm text-gray-500">{h.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No holidays configured</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Blocked Periods ({calendar.year})</CardTitle>
                <Button size="sm" onClick={handleOpenBlocked}>
                  Add Blocked Period
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {calendar.blockedPeriods && calendar.blockedPeriods.length > 0 ? (
                <div className="space-y-2">
                  {calendar.blockedPeriods.map((period, index) => (
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
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No blocked periods configured</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">
              No calendar found for {year}. Create a new calendar to get started.
            </p>
            <Button onClick={handleOpenCreate}>Create Calendar</Button>
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

