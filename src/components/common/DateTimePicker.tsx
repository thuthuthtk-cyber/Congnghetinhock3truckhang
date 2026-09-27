import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Clock, X } from 'lucide-react';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  placeholder = 'MM/DD/YYYY hh:mm A',
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date from string value like "09/03/2026 12:45 PM"
  const parseDateString = (valStr: string) => {
    if (!valStr) {
      const now = new Date();
      return {
        year: now.getFullYear(),
        month: now.getMonth(), // 0-indexed
        day: now.getDate(),
        hour: ((now.getHours() % 12) || 12),
        minute: now.getMinutes(),
        period: now.getHours() >= 12 ? 'PM' : 'AM'
      };
    }

    // Try parsing format "MM/DD/YYYY hh:mm A" or "MM/DD/YYYY hh:mm:ss"
    const match = valStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?:\s*(AM|PM))?)?/i);
    if (match) {
      const m = parseInt(match[1], 10) - 1;
      const d = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      let h = match[4] ? parseInt(match[4], 10) : 12;
      const min = match[5] ? parseInt(match[5], 10) : 0;
      const p = match[6] ? match[6].toUpperCase() : (h >= 12 ? 'PM' : 'AM');
      if (h > 12) h = h % 12 || 12;
      return { year: y, month: Math.max(0, Math.min(11, m)), day: d, hour: Math.max(1, Math.min(12, h)), minute: Math.max(0, Math.min(59, min)), period: p === 'PM' ? 'PM' : 'AM' };
    }

    // Fallback standard Date
    const d = new Date(valStr);
    if (!isNaN(d.getTime())) {
      let h = d.getHours();
      const p = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate(),
        hour: h,
        minute: d.getMinutes(),
        period: p
      };
    }

    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
      hour: 12,
      minute: 0,
      period: 'PM'
    };
  };

  const initial = parseDateString(value);
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [selectedMonth, setSelectedMonth] = useState(initial.month);
  const [selectedDay, setSelectedDay] = useState(initial.day);
  const [selectedHour, setSelectedHour] = useState(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initial.period as 'AM' | 'PM');

  // Sync internal state when external value changes
  useEffect(() => {
    const parsed = parseDateString(value);
    setSelectedYear(parsed.year);
    setSelectedMonth(parsed.month);
    setSelectedDay(parsed.day);
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedPeriod(parsed.period as 'AM' | 'PM');
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const emitChange = (y: number, m: number, d: number, h: number, min: number, p: 'AM' | 'PM') => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const yyyy = String(y);
    const hh = String(h).padStart(2, '0');
    const minStr = String(min).padStart(2, '0');
    const formatted = `${mm}/${dd}/${yyyy} ${hh}:${minStr} ${p}`;
    onChange(formatted);
  };

  const handleSelectDay = (d: number, mOffset: number = 0) => {
    let newMonth = selectedMonth + mOffset;
    let newYear = selectedYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    setSelectedDay(d);
    emitChange(newYear, newMonth, d, selectedHour, selectedMinute, selectedPeriod);
  };

  const handleSelectHour = (h: number) => {
    setSelectedHour(h);
    emitChange(selectedYear, selectedMonth, selectedDay, h, selectedMinute, selectedPeriod);
  };

  const handleSelectMinute = (min: number) => {
    setSelectedMinute(min);
    emitChange(selectedYear, selectedMonth, selectedDay, selectedHour, min, selectedPeriod);
  };

  const handleSelectPeriod = (p: 'AM' | 'PM') => {
    setSelectedPeriod(p);
    emitChange(selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute, p);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    let h = now.getHours();
    const p = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const min = now.getMinutes();

    setSelectedYear(y);
    setSelectedMonth(m);
    setSelectedDay(d);
    setSelectedHour(h);
    setSelectedMinute(min);
    setSelectedPeriod(p);
    emitChange(y, m, d, h, min, p);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  // Calendar Calculation
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sun
  const daysInCurrentMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const prevMonthDays = [];
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    prevMonthDays.push(daysInPrevMonth - i);
  }

  const currentMonthDays = [];
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    currentMonthDays.push(i);
  }

  const totalCells = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDaysCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const nextMonthDays = [];
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    nextMonthDays.push(i);
  }

  // Common minute steps
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 46, 47, 48, 49, 50, 51, 52, 55];
  const hoursList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Input Field */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors shadow-2xs ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''
        } ${isOpen ? 'border-indigo-600 ring-2 ring-indigo-100' : ''}`}
      >
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setIsOpen(true);
          }}
          className="w-full bg-transparent font-medium text-slate-800 text-sm focus:outline-none cursor-pointer"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setIsOpen(!isOpen);
          }}
          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer shrink-0"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Popover DateTime Picker - Matched to Image 2 design */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 flex flex-col sm:flex-row gap-4 min-w-[340px] sm:min-w-[440px] animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Left Column: Calendar */}
          <div className="flex-1 min-w-[210px]">
            {/* Month & Year Navigation Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-slate-800">
                  {MONTH_NAMES_EN[selectedMonth]} {selectedYear}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
              </div>

              <div className="flex items-center gap-1 text-slate-500">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Tháng trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Tháng sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays Header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="text-[11px] font-bold text-slate-400 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Previous month days */}
              {prevMonthDays.map((d) => (
                <button
                  key={`prev-${d}`}
                  type="button"
                  onClick={() => handleSelectDay(d, -1)}
                  className="h-8 text-xs text-slate-300 hover:bg-slate-50 rounded-lg flex items-center justify-center font-medium cursor-pointer"
                >
                  {d}
                </button>
              ))}

              {/* Current month days */}
              {currentMonthDays.map((d) => {
                const isSelected = selectedDay === d;
                return (
                  <button
                    key={`curr-${d}`}
                    type="button"
                    onClick={() => handleSelectDay(d, 0)}
                    className={`h-8 text-xs rounded-lg flex items-center justify-center transition-colors cursor-pointer font-bold ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}

              {/* Next month days */}
              {nextMonthDays.map((d) => (
                <button
                  key={`next-${d}`}
                  type="button"
                  onClick={() => handleSelectDay(d, 1)}
                  className="h-8 text-xs text-slate-300 hover:bg-slate-50 rounded-lg flex items-center justify-center font-medium cursor-pointer"
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Calendar Footer Links */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs font-semibold">
              <button
                type="button"
                onClick={handleClear}
                className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
              >
                Today
              </button>
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="hidden sm:block w-px bg-slate-100 my-1" />

          {/* Right Column: Time Picker */}
          <div className="w-full sm:w-44 flex flex-col justify-between pt-1 sm:pt-0">
            {/* Time Header Buttons (3 blue pills) */}
            <div className="grid grid-cols-3 gap-1 mb-2.5">
              <div className="bg-blue-600 text-white text-xs font-black py-1.5 px-2 rounded-lg text-center shadow-2xs">
                {String(selectedHour).padStart(2, '0')}
              </div>
              <div className="bg-blue-600 text-white text-xs font-black py-1.5 px-2 rounded-lg text-center shadow-2xs">
                {String(selectedMinute).padStart(2, '0')}
              </div>
              <div className="bg-blue-600 text-white text-xs font-black py-1.5 px-2 rounded-lg text-center shadow-2xs">
                {selectedPeriod}
              </div>
            </div>

            {/* Columns for Hours, Minutes, AM/PM */}
            <div className="grid grid-cols-3 gap-1.5 h-44 overflow-hidden">
              {/* Hours List */}
              <div className="overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                {hoursList.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleSelectHour(h)}
                    className={`w-full py-1 text-xs font-semibold rounded text-center transition-colors cursor-pointer ${
                      selectedHour === h
                        ? 'bg-blue-600 text-white font-black'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {String(h).padStart(2, '0')}
                  </button>
                ))}
              </div>

              {/* Minutes List */}
              <div className="overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
                {minutesList.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleSelectMinute(m)}
                    className={`w-full py-1 text-xs font-semibold rounded text-center transition-colors cursor-pointer ${
                      selectedMinute === m
                        ? 'bg-blue-600 text-white font-black'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>

              {/* AM / PM List */}
              <div className="space-y-1">
                {(['AM', 'PM'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSelectPeriod(p)}
                    className={`w-full py-1.5 text-xs font-bold rounded text-center transition-colors cursor-pointer ${
                      selectedPeriod === p
                        ? 'bg-blue-600 text-white font-black'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
