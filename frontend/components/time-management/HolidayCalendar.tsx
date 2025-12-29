"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/shared/ui/Card";
import { Button } from "@/components/shared/ui/Button";
import { Select } from "@/components/leaves/Select";
import { Modal } from "@/components/leaves/Modal";
import { useToast } from "@/components/leaves/Toast";
import { useAuth } from "@/lib/hooks/use-auth";
import { SystemRole } from "@/types";
import { policyConfigApi } from "@/lib/api/time-management/policy-config.api";
import { Holiday, HolidayType } from "@/types/time-management";

// ===== TYPES =====
export interface HolidayCalendarProps {
  /** Called when a holiday is clicked */
  onHolidayClick?: (holiday: Holiday) => void;
  /** Show only active holidays */
  activeOnly?: boolean;
  /** Initial year to display */
  initialYear?: number;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  holidays: Holiday[];
}

// ===== COMPONENT =====
export default function HolidayCalendar({ 
  onHolidayClick, 
  activeOnly = true,
  initialYear = new Date().getFullYear()
}: HolidayCalendarProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Role check - viewable by many roles per BR-TM-17
  const canView = user?.roles?.some(role => [
    SystemRole.HR_ADMIN,
    SystemRole.HR_MANAGER,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.DEPARTMENT_HEAD,
    SystemRole.DEPARTMENT_EMPLOYEE,
  ].includes(role as SystemRole));

  // State
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

  // Month names
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Day names
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Load holidays
  const loadHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = new Date(currentYear, 0, 1).toISOString();
      const endDate = new Date(currentYear, 11, 31).toISOString();
      
      const data = await policyConfigApi.getHolidays({
        startDate,
        endDate,
        active: activeOnly ? true : undefined,
      });
      
      setHolidays(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to load holidays:", error);
      showToast(error.message || "Failed to load holidays", "error");
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [currentYear, activeOnly, showToast]);

  useEffect(() => {
    loadHolidays();
  }, [loadHolidays]);

  // Get holidays for a specific date
  const getHolidaysForDate = useCallback((date: Date): Holiday[] => {
    return holidays.filter(holiday => {
      const holidayStart = new Date(holiday.startDate);
      const holidayEnd = holiday.endDate ? new Date(holiday.endDate) : holidayStart;
      
      // Normalize dates to compare only date part
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const start = new Date(holidayStart.getFullYear(), holidayStart.getMonth(), holidayStart.getDate());
      const end = new Date(holidayEnd.getFullYear(), holidayEnd.getMonth(), holidayEnd.getDate());
      
      return checkDate >= start && checkDate <= end;
    });
  }, [holidays]);

  // Generate calendar days for current month
  const calendarDays = useMemo((): CalendarDay[] => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    // Add days from previous month
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        holidays: getHolidaysForDate(date),
      });
    }
    
    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        holidays: getHolidaysForDate(date),
      });
    }
    
    // Add days from next month to complete the grid (6 rows)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentYear, currentMonth + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        holidays: getHolidaysForDate(date),
      });
    }
    
    return days;
  }, [currentYear, currentMonth, getHolidaysForDate]);

  // Get holidays for a month (year view)
  const getHolidaysForMonth = useCallback((month: number): Holiday[] => {
    return holidays.filter(holiday => {
      const holidayStart = new Date(holiday.startDate);
      const holidayEnd = holiday.endDate ? new Date(holiday.endDate) : holidayStart;
      
      // Check if holiday overlaps with the month
      const monthStart = new Date(currentYear, month, 1);
      const monthEnd = new Date(currentYear, month + 1, 0);
      
      return holidayStart <= monthEnd && holidayEnd >= monthStart;
    });
  }, [holidays, currentYear]);

  // Get holiday type color
  const getHolidayTypeColor = (type: HolidayType): string => {
    switch (type) {
      case HolidayType.NATIONAL:
        return "bg-blue-500";
      case HolidayType.ORGANIZATIONAL:
        return "bg-purple-500";
      case HolidayType.WEEKLY_REST:
        return "bg-gray-400";
      default:
        return "bg-gray-500";
    }
  };

  const getHolidayTypeBadge = (type: HolidayType): string => {
    switch (type) {
      case HolidayType.NATIONAL:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case HolidayType.ORGANIZATIONAL:
        return "bg-purple-100 text-purple-800 border-purple-200";
      case HolidayType.WEEKLY_REST:
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Navigation
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Handle holiday click
  const handleHolidayClick = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setIsDetailsModalOpen(true);
    onHolidayClick?.(holiday);
  };

  if (!canView) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <p>You don&apos;t have permission to view the holiday calendar.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Holiday Calendar (BR-TM-17)</CardTitle>
              <CardDescription>
                View national holidays, organizational holidays, and weekly rest days linked to shift schedules
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as "month" | "year")}
                options={[
                  { value: "month", label: "Month View" },
                  { value: "year", label: "Year View" },
                ]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={goToPreviousMonth}>
                ← Previous
              </Button>
              <Button variant="outline" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" onClick={goToNextMonth}>
                Next →
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={currentMonth.toString()}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                options={monthNames.map((name, index) => ({
                  value: index.toString(),
                  label: name,
                }))}
              />
              <Select
                value={currentYear.toString()}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                options={Array.from({ length: 10 }, (_, i) => ({
                  value: (currentYear - 5 + i).toString(),
                  label: (currentYear - 5 + i).toString(),
                }))}
              />
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-sm text-gray-600">National Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              <span className="text-sm text-gray-600">Organizational Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-400"></span>
              <span className="text-sm text-gray-600">Weekly Rest Day</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-50"></span>
              <span className="text-sm text-gray-600">Today</span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading calendar...</p>
            </div>
          ) : viewMode === "month" ? (
            /* Month View */
            <div>
              <h3 className="text-xl font-semibold text-center mb-4">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-medium text-gray-600 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`min-h-[80px] p-1 border rounded-lg ${
                      !day.isCurrentMonth
                        ? "bg-gray-50 text-gray-400"
                        : day.isToday
                        ? "bg-blue-50 border-blue-500 border-2"
                        : day.isWeekend
                        ? "bg-gray-100"
                        : "bg-white"
                    }`}
                  >
                    <div className="text-right text-sm font-medium mb-1">
                      {day.date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {day.holidays.slice(0, 2).map((holiday, hIndex) => (
                        <button
                          key={hIndex}
                          onClick={() => handleHolidayClick(holiday)}
                          className={`w-full text-left text-xs px-1 py-0.5 rounded truncate text-white ${getHolidayTypeColor(
                            holiday.type
                          )} hover:opacity-80 transition-opacity`}
                          title={holiday.name}
                        >
                          {holiday.name}
                        </button>
                      ))}
                      {day.holidays.length > 2 && (
                        <span className="text-xs text-gray-500 px-1">
                          +{day.holidays.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Year View */
            <div>
              <h3 className="text-xl font-semibold text-center mb-4">
                {currentYear} - Year Overview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {monthNames.map((month, index) => {
                  const monthHolidays = getHolidaysForMonth(index);
                  return (
                    <div
                      key={month}
                      className="border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setCurrentMonth(index);
                        setViewMode("month");
                      }}
                    >
                      <h4 className="font-medium text-gray-900 mb-2">{month}</h4>
                      {monthHolidays.length > 0 ? (
                        <div className="space-y-1">
                          {monthHolidays.slice(0, 3).map((holiday, hIndex) => (
                            <div
                              key={hIndex}
                              className="flex items-center gap-1"
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${getHolidayTypeColor(
                                  holiday.type
                                )}`}
                              ></span>
                              <span className="text-xs text-gray-600 truncate">
                                {holiday.name}
                              </span>
                            </div>
                          ))}
                          {monthHolidays.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{monthHolidays.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No holidays</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Holidays Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Holidays</CardTitle>
          <CardDescription>Next 5 upcoming holidays</CardDescription>
        </CardHeader>
        <CardContent>
          {holidays
            .filter((h) => new Date(h.startDate) >= new Date())
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 5)
            .map((holiday) => (
              <div
                key={holiday._id || holiday.id}
                className="flex items-center justify-between py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 px-2 rounded"
                onClick={() => handleHolidayClick(holiday)}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${getHolidayTypeColor(holiday.type)}`}></span>
                  <div>
                    <p className="font-medium text-gray-900">{holiday.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(holiday.startDate).toLocaleDateString()}
                      {holiday.endDate && holiday.endDate !== holiday.startDate && (
                        <> - {new Date(holiday.endDate).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded border ${getHolidayTypeBadge(holiday.type)}`}>
                  {holiday.type}
                </span>
              </div>
            ))}
          {holidays.filter((h) => new Date(h.startDate) >= new Date()).length === 0 && (
            <p className="text-gray-500 text-center py-4">No upcoming holidays</p>
          )}
        </CardContent>
      </Card>

      {/* Holiday Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedHoliday(null);
        }}
        title="Holiday Details"
        size="md"
      >
        {selectedHoliday && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <p className="text-gray-900 font-medium">{selectedHoliday.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <span className={`inline-block px-3 py-1 rounded text-sm font-medium border ${getHolidayTypeBadge(selectedHoliday.type)}`}>
                {selectedHoliday.type}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <p className="text-gray-900">{new Date(selectedHoliday.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <p className="text-gray-900">
                  {selectedHoliday.endDate
                    ? new Date(selectedHoliday.endDate).toLocaleDateString()
                    : "Same as start date"}
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                selectedHoliday.active
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}>
                {selectedHoliday.active ? "Active" : "Inactive"}
              </span>
            </div>
            {selectedHoliday.createdAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                <p className="text-gray-500 text-sm">
                  {new Date(selectedHoliday.createdAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
