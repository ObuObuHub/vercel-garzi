import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Calendar, Users, Bell, Building2, ArrowLeftRight, Clock, CheckCircle, 
    AlertCircle, ChevronLeft, ChevronRight, Menu, X, Settings, Shield, 
    Wand2, Plus, Edit2, Trash2, Save, UserCog 
} from 'lucide-react';

// Default shift types
const DEFAULT_SHIFT_TYPES = {
  ZI: { id: 'zi', name: 'Tură de Zi', start: '08:00', end: '15:00', color: '#3B82F6', duration: 7 },
  DUPA_AMIAZA: { id: 'dupa_amiaza', name: 'Tură După-Amiază', start: '10:00', end: '17:00', color: '#8B5CF6', duration: 7 },
  GARDA_ZI: { id: 'garda_zi', name: 'Gardă de Zi', start: '08:00', end: '20:00', color: '#10B981', duration: 12 },
  NOAPTE: { id: 'noapte', name: 'Tură de Noapte', start: '20:00', end: '08:00', color: '#F59E0B', duration: 12 },
  GARDA_24: { id: 'garda_24', name: 'Gardă 24 ore', start: '08:00', end: '08:00', color: '#EF4444', duration: 24 }
};

// Main App Component
const HospitalShiftScheduler = () => {
  // --- STATE MANAGEMENT ---
  const [currentUser, setCurrentUser] = useState({
    id: 1,
    name: 'Admin Principal',
    role: 'admin', // 'staff', 'manager', or 'admin'
    hospital: 'spital1'
  });

  const [selectedHospital, setSelectedHospital] = useState('spital1');
  const [currentView, setCurrentView] = useState('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState({});
  const [staff, setStaff] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [shiftTypes, setShiftTypes] = useState(DEFAULT_SHIFT_TYPES);
  const [hospitals, setHospitals] = useState([
    { id: 'spital1', name: 'Spital Județean Urgență' },
    { id: 'spital2', name: 'Spital Municipal' },
    { id: 'spital3', name: 'Spital Pediatrie' }
  ]);

  // Admin Panel states
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingHospital, setEditingHospital] = useState(null);
  const [editingShiftType, setEditingShiftType] = useState(null);

  // --- PERMISSIONS ---
  const hasPermission = useCallback((action) => {
    const permissions = {
      staff: ['view_schedule', 'request_exchange'],
      manager: ['view_schedule', 'request_exchange', 'assign_staff', 'generate_shifts', 'approve_exchanges'],
      admin: ['view_schedule', 'request_exchange', 'assign_staff', 'generate_shifts', 'approve_exchanges', 'edit_staff', 'edit_hospitals', 'edit_shift_types', 'edit_system']
    };
    return permissions[currentUser.role]?.includes(action) || false;
  }, [currentUser.role]);

  // --- NOTIFICATIONS ---
  const addNotification = useCallback((message, type = 'info') => {
    const newNotification = { id: Date.now(), message, type, timestamp: new Date() };
    setNotifications(prev => [newNotification, ...prev].slice(0, 10));
  }, []);
  
  // --- DATA GENERATION & EFFECTS ---
  const generateMockShifts = useCallback(() => {
    const newShifts = {};
    const monthStartDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    for (let i = 0; i < daysInMonth; i++) {
      const date = new Date(monthStartDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      newShifts[dateKey] = [];
      
      // Randomly generate shifts for demo purposes
      if (Math.random() > 0.3) {
        newShifts[dateKey].push({
          id: `${dateKey}-zi`, type: shiftTypes.ZI, staffIds: [1, 3], 
          required: { medic: 1, asistent: 2, infirmier: 1 }
        });
      }
      if (Math.random() > 0.5) {
        newShifts[dateKey].push({
          id: `${dateKey}-noapte`, type: shiftTypes.NOAPTE, staffIds: [2, 4, 5],
          required: { medic: 1, asistent: 1, infirmier: 1 }
        });
      }
    }
    setShifts(newShifts);
  }, [currentDate, shiftTypes]);

  useEffect(() => {
    const mockStaff = [
      { id: 1, name: 'Dr. Popescu Ion', type: 'medic', specialization: 'Urgențe', hospital: 'spital1', role: 'staff' },
      { id: 2, name: 'Dr. Ionescu Maria', type: 'medic', specialization: 'Chirurgie', hospital: 'spital1', role: 'manager' },
      { id: 3, name: 'As. Radu Ana', type: 'asistent', specialization: 'ATI', hospital: 'spital1', role: 'staff' },
      { id: 4, name: 'As. Popa Elena', type: 'asistent', specialization: 'Urgențe', hospital: 'spital1', role: 'staff' },
      { id: 5, name: 'Inf. Stan Mihai', type: 'infirmier', specialization: 'General', hospital: 'spital1', role: 'staff' },
      { id: 6, name: 'Dr. Gheorghe Andrei', type: 'medic', specialization: 'Pediatrie', hospital: 'spital2', role: 'staff' }
    ];
    setStaff(mockStaff);
    generateMockShifts();
  }, [selectedHospital, currentDate, generateMockShifts]);

  // --- CORE LOGIC FUNCTIONS ---
  const generateAutomaticShifts = useCallback(() => {
    if (!hasPermission('generate_shifts')) {
      addNotification('Nu aveți permisiunea de a genera ture automat', 'error');
      return;
    }
    generateMockShifts();
    addNotification('Ture generate automat pentru luna curentă!', 'success');
  }, [hasPermission, addNotification, generateMockShifts]);

  const checkMinimumStaff = useCallback((shift) => {
    if (!shift || !shift.staffIds || !shift.required) return { isValid: false, counts: {} };
    const assignedStaff = staff.filter(s => shift.staffIds.includes(s.id));
    const counts = {
      medic: assignedStaff.filter(s => s.type === 'medic').length,
      asistent: assignedStaff.filter(s => s.type === 'asistent').length,
      infirmier: assignedStaff.filter(s => s.type === 'infirmier').length
    };
    return {
      isValid: counts.medic >= shift.required.medic &&
               counts.asistent >= shift.required.asistent &&
               counts.infirmier >= shift.required.infirmier,
      counts
    };
  }, [staff]);

  // --- CRUD Functions (Admin) ---
  const addStaffItem = useCallback((newStaff) => {
    if (!hasPermission('edit_staff')) return;
    const staffMember = { id: Date.now(), ...newStaff, role: 'staff' };
    setStaff(prev => [...prev, staffMember]);
    addNotification(`Personal adăugat: ${newStaff.name}`, 'success');
  }, [hasPermission, addNotification]);

  const updateStaffItem = useCallback((id, updates) => {
    if (!hasPermission('edit_staff')) return;
    setStaff(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    addNotification('Personal actualizat', 'success');
  }, [hasPermission, addNotification]);

  const deleteStaffItem = useCallback((id) => {
    if (!hasPermission('edit_staff')) return;
    setStaff(prev => prev.filter(s => s.id !== id));
    addNotification('Personal șters', 'success');
  }, [hasPermission, addNotification]);

  const addHospital = useCallback((name) => {
    if (!hasPermission('edit_hospitals')) return;
    const newHospital = { id: `spital${Date.now()}`, name };
    setHospitals(prev => [...prev, newHospital]);
    addNotification(`Spital adăugat: ${name}`, 'success');
  }, [hasPermission, addNotification]);

  const updateHospital = useCallback((id, name) => {
    if (!hasPermission('edit_hospitals')) return;
    setHospitals(prev => prev.map(h => h.id === id ? { ...h, name } : h));
    addNotification('Spital actualizat', 'success');
  }, [hasPermission, addNotification]);

  const deleteHospital = useCallback((id) => {
    if (!hasPermission('edit_hospitals')) return;
    if (hospitals.length <= 1) {
      addNotification('Nu puteți șterge ultimul spital', 'error');
      return;
    }
    const remainingHospitals = hospitals.filter(h => h.id !== id);
    setHospitals(remainingHospitals);
    if (selectedHospital === id) {
      setSelectedHospital(remainingHospitals[0].id);
    }
    addNotification('Spital șters', 'success');
  }, [hasPermission, addNotification, hospitals, selectedHospital]);
  
  // --- SUB-COMPONENTS ---
  const RoleSwitcher = () => (
    <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2">
      <Shield className="w-4 h-4 text-gray-600" />
      <select
        value={currentUser.role}
        onChange={(e) => setCurrentUser({ ...currentUser, role: e.target.value })}
        className="text-sm bg-transparent focus:outline-none"
      >
        <option value="staff">Personal</option>
        <option value="manager">Manager</option>
        <option value="admin">Administrator</option>
      </select>
    </div>
  );

  const CalendarView = () => {
    const days = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysArray = [];
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        for (let i = firstDayOfMonth; i > 0; i--) {
            daysArray.push(new Date(year, month - 1, prevMonthLastDay - i + 1));
        }
        for (let i = 1; i <= daysInMonth; i++) {
            daysArray.push(new Date(year, month, i));
        }
        const remaining = 42 - daysArray.length;
        for (let i = 1; i <= remaining; i++) {
            daysArray.push(new Date(year, month + 1, i));
        }
        return daysArray;
    }, [currentDate]);

    const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'];
    const weekDays = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{months[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          <div className="flex items-center space-x-2">
            <button onClick={() => setCurrentDate(d => new Date(d.setMonth(d.getMonth() - 1)))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600">Azi</button>
            <button onClick={() => setCurrentDate(d => new Date(d.setMonth(d.getMonth() + 1)))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
            {hasPermission('generate_shifts') && <button onClick={generateAutomaticShifts} className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"><Wand2 className="w-4 h-4 mr-2" />Generare</button>}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">{day}</div>)}
          {days.map((date, index) => {
            const dateKey = date.toISOString().split('T')[0];
            const dayShifts = shifts[dateKey] || [];
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div key={index} className={`min-h-[120px] p-2 border rounded-lg cursor-pointer transition-all ${!isCurrentMonth ? 'bg-gray-50 opacity-50' : 'bg-white hover:shadow-md'} ${isToday ? 'ring-2 ring-blue-400' : 'border-gray-200'}`} onClick={() => setSelectedShift({ date, shifts: dayShifts })}>
                <div className={`font-semibold text-sm mb-1 ${!isCurrentMonth && 'text-gray-400'}`}>{date.getDate()}</div>
                <div className="space-y-1">
                  {dayShifts.slice(0, 2).map(shift => {
                    const { isValid } = checkMinimumStaff(shift);
                    return (
                      <div key={shift.id} className="text-xs p-1 rounded flex items-center justify-between" style={{ backgroundColor: shift.type.color + '20', borderLeft: `3px solid ${shift.type.color}` }}>
                        <span className="truncate">{shift.type.name.split(' ')[0]}</span>
                        {!isValid && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0 ml-1" title="Personal insuficient" />}
                      </div>
                    );
                  })}
                  {dayShifts.length > 2 && <div className="text-xs text-gray-500 text-center">+{dayShifts.length - 2} altele</div>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4 justify-center text-sm">
          {Object.values(shiftTypes).map(shift => <div key={shift.id} className="flex items-center"><div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: shift.color }}></div><span>{shift.name}</span></div>)}
        </div>
      </div>
    );
  };
  
    const AdminPanel = () => {
    if (!hasPermission('edit_system')) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-center text-gray-500">Nu aveți permisiuni de administrator.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800">Panou de Administrare</h3>
          {/* More admin features can be added here */}
        </div>
      </div>
    );
  };
  
  const ShiftExchangeView = () => (
      <div className="bg-white rounded-xl shadow-lg p-6"><h2 className="text-2xl font-bold">Schimb de Ture</h2><p className="text-gray-500 mt-2">Funcționalitate în dezvoltare.</p></div>
  );
  
   const StaffView = () => (
      <div className="bg-white rounded-xl shadow-lg p-6"><h2 className="text-2xl font-bold">Personalul Spitalului</h2><p className="text-gray-500 mt-2">Aici va fi afișată lista personalului.</p></div>
  );

  const NotificationsPanel = () => (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-40">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold flex items-center"><Bell className="w-4 h-4 mr-2" />Notificări</h3>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="p-4 text-center text-gray-500 text-sm">Nu aveți notificări noi</p>
        ) : (
          notifications.map(notif => (
            <div key={notif.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
              <p className="text-sm">{notif.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {notif.timestamp.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );


  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="lg:hidden p-2 rounded-md hover:bg-gray-100"><Menu className="w-6 h-6" /></button>
              <h1 className="ml-2 text-xl font-bold text-gray-800">Planificator Ture</h1>
            </div>
            <div className="flex items-center space-x-4">
              <RoleSwitcher />
              <div className="hidden md:flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-gray-400" />
                <select value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  {hospitals.map(hospital => <option key={hospital.id} value={hospital.id}>{hospital.name}</option>)}
                </select>
              </div>
              <div className="relative">
                <button onClick={() => setShowNotifications(s => !s)} className="p-2 hover:bg-gray-100 rounded-lg relative">
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && !showNotifications && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
                {showNotifications && <NotificationsPanel />}
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className={`lg:block ${showMobileMenu ? 'block' : 'hidden'} bg-white border-b border-gray-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:space-x-8">
                {[
                    { view: 'calendar', label: 'Calendar Ture', icon: Calendar },
                    { view: 'exchange', label: 'Schimb Ture', icon: ArrowLeftRight },
                    { view: 'staff', label: 'Personal', icon: Users },
                    ...(hasPermission('edit_system') ? [{ view: 'admin', label: 'Administrare', icon: Settings }] : [])
                ].map(({ view, label, icon: Icon }) => (
                    <button
                        key={view}
                        onClick={() => { setCurrentView(view); setShowMobileMenu(false); }}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center ${
                            currentView === view
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <Icon className="w-5 h-5 mr-2" />
                        {label}
                    </button>
                ))}
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'calendar' && <CalendarView />}
        {currentView === 'exchange' && <ShiftExchangeView />}
        {currentView === 'staff' && <StaffView />}
        {currentView === 'admin' && <AdminPanel />}
      </main>
      
      {/* Modals will be rendered here if they are re-added */}
    </div>
  );
};

export default HospitalShiftScheduler;
