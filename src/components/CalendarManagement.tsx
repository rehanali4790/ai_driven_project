import { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Plus, Trash2, Save } from 'lucide-react';
import { WorkingCalendar, CalendarException } from '@/lib/types';
import { useProjectData } from '@/context/ProjectDataContext';

export default function CalendarManagement() {
  const { workspace, state, upsertCalendar, userRole } = useProjectData();
  const [editableCalendar, setEditableCalendar] = useState<WorkingCalendar | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayType, setNewHolidayType] = useState<'holiday' | 'override'>('holiday');
  const [newHolidayHours, setNewHolidayHours] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const calendars = workspace?.calendars ?? [];
  const canEditCalendar = userRole === 'admin';
  const activeProjectCalendarId = state?.project.calendarId;

  const selectedCalendar = useMemo(
    () => calendars.find((calendar) => calendar.id === selectedCalendarId) ?? null,
    [calendars, selectedCalendarId],
  );

  useEffect(() => {
    if (!calendars.length) return;
    const preferredId = activeProjectCalendarId && calendars.some((c) => c.id === activeProjectCalendarId)
      ? activeProjectCalendarId
      : calendars[0].id;
    if (!selectedCalendarId) setSelectedCalendarId(preferredId);
  }, [activeProjectCalendarId, calendars, selectedCalendarId]);

  useEffect(() => {
    if (!selectedCalendar) {
      setEditableCalendar(null);
      return;
    }
    setEditableCalendar({
      ...selectedCalendar,
      workWeek: [...selectedCalendar.workWeek],
      exceptions: [...selectedCalendar.exceptions],
    });
    setSaveMessage(null);
  }, [selectedCalendar]);

  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleWorkDayToggle = (dayIndex: number) => {
    if (!editableCalendar) return;
    const newWorkWeek = [...editableCalendar.workWeek];
    newWorkWeek[dayIndex] = !newWorkWeek[dayIndex];
    setEditableCalendar({ ...editableCalendar, workWeek: newWorkWeek });
    setSaveMessage(null);
  };

  const handleDailyHoursChange = (hours: number) => {
    if (!editableCalendar) return;
    setEditableCalendar({ ...editableCalendar, dailyHours: hours });
    setSaveMessage(null);
  };

  const handleAddHoliday = () => {
    if (!editableCalendar || !newHolidayDate) return;
    const newException: CalendarException = {
      date: newHolidayDate,
      type: newHolidayType,
      hours: newHolidayType === 'override' ? newHolidayHours : undefined
    };
    const nextExceptions = editableCalendar.exceptions
      .filter((exception) => exception.date !== newException.date)
      .concat(newException)
      .sort((a, b) => a.date.localeCompare(b.date));
    setEditableCalendar({ ...editableCalendar, exceptions: nextExceptions });
    setNewHolidayDate('');
    setNewHolidayHours(0);
    setSaveMessage(null);
  };

  const handleRemoveHoliday = (date: string) => {
    if (!editableCalendar) return;
    setEditableCalendar({
      ...editableCalendar,
      exceptions: editableCalendar.exceptions.filter((exception) => exception.date !== date),
    });
    setSaveMessage(null);
  };

  const handleSaveCalendar = async () => {
    if (!editableCalendar || !canEditCalendar) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await upsertCalendar(editableCalendar);
      setSaveMessage('Calendar saved and synchronized.');
    } catch {
      setSaveMessage('Save failed. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!state || !workspace || !editableCalendar) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f3433]">Calendar Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure working time rules used by Gantt scheduling and resource allocations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCalendarId}
            onChange={(e) => setSelectedCalendarId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-[#0f3433]"
          >
            {calendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void handleSaveCalendar()}
            disabled={!canEditCalendar || isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-[#12b3a8] text-white rounded-lg hover:bg-[#0f9d94] transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      {saveMessage && <p className="text-sm text-[#0f3433]">{saveMessage}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Working Hours Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-[#12b3a8]" />
            <h2 className="text-lg font-bold text-[#0f3433]">Working Hours</h2>
          </div>

          {/* Daily Hours Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Daily Working Hours
            </label>
            <input
              type="number"
              min="1"
              max="24"
              disabled={!canEditCalendar}
              value={editableCalendar.dailyHours || 8}
              onChange={(e) => handleDailyHoursChange(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12b3a8]"
            />
          </div>

          {/* Work Week Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Working Days
            </label>
            <div className="space-y-2">
              {weekDays.map((day, index) => (
                <label
                  key={day}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    disabled={!canEditCalendar}
                    checked={editableCalendar.workWeek[index] || false}
                    onChange={() => handleWorkDayToggle(index)}
                    className="w-4 h-4 text-[#12b3a8] border-gray-300 rounded focus:ring-[#12b3a8]"
                  />
                  <span className="text-sm font-medium text-gray-700">{day}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Holidays Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-[#12b3a8]" />
            <h2 className="text-lg font-bold text-[#0f3433]">Holidays & Exceptions</h2>
          </div>

          {/* Add Holiday Form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Add Holiday/Exception
            </label>
            
            <div className="space-y-3">
              <input
                type="date"
                disabled={!canEditCalendar}
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12b3a8]"
              />
              
              <select
                disabled={!canEditCalendar}
                value={newHolidayType}
                onChange={(e) => setNewHolidayType(e.target.value as 'holiday' | 'override')}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12b3a8]"
              >
                <option value="holiday">Holiday (Non-working)</option>
                <option value="override">Working Hours Override</option>
              </select>
              
              {newHolidayType === 'override' && (
                <input
                  type="number"
                  disabled={!canEditCalendar}
                  min="0"
                  max="24"
                  value={newHolidayHours}
                  onChange={(e) => setNewHolidayHours(Number(e.target.value))}
                  placeholder="Working hours"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12b3a8]"
                />
              )}
              
              <button
                onClick={handleAddHoliday}
                disabled={!canEditCalendar || !newHolidayDate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#12b3a8] text-white rounded-lg hover:bg-[#0f9d94] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Exception
              </button>
            </div>
          </div>

          {/* Holidays List */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Configured Exceptions
            </label>
            
            {editableCalendar.exceptions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No holidays or exceptions configured
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {editableCalendar.exceptions.map((exception) => (
                  <div
                    key={exception.date}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {new Date(exception.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {exception.type === 'holiday' 
                          ? 'Non-working day' 
                          : `${exception.hours} hours`}
                      </p>
                    </div>
                    <button
                      disabled={!canEditCalendar}
                      onClick={() => handleRemoveHoliday(exception.date)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-[#0f3433] mb-4">Calendar Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#f0f9f8] rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Working Days per Week</p>
            <p className="text-2xl font-bold text-[#12b3a8]">
              {editableCalendar.workWeek.filter(Boolean).length || 0}
            </p>
          </div>
          <div className="p-4 bg-[#f0f9f8] rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Daily Working Hours</p>
            <p className="text-2xl font-bold text-[#12b3a8]">
              {editableCalendar.dailyHours || 0}h
            </p>
          </div>
          <div className="p-4 bg-[#f0f9f8] rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Total Exceptions</p>
            <p className="text-2xl font-bold text-[#12b3a8]">
              {editableCalendar.exceptions.length || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
