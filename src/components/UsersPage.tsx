import React, { useState } from 'react';
import { UserPersonnel, DepartmentGroup, PositionType, SystemSettings, POSITIONS_BY_GROUP } from '../types';
import { alertHelper, storageService } from '../services/storage';

interface UsersPageProps {
  users: UserPersonnel[];
  settings: SystemSettings;
  onRefreshData: () => void;
}

const DEPARTMENT_GROUPS: DepartmentGroup[] = [
  'ข้าราชการ+ลูกจ้าง',
  'พนักงานเงินรายได้, พนักงานมหาวิทยาลัย, พนักงานราชการ',
  'อาจารย์'
];

export const UsersPage: React.FC<UsersPageProps> = ({ users, settings, onRefreshData }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserPersonnel | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<UserPersonnel>>({
    citizenId: '',
    title: 'นาย',
    firstName: '',
    lastName: '',
    departmentGroup: 'ข้าราชการ+ลูกจ้าง',
    position: 'พนักงานมหาวิทยาลัย',
    accumulatedLeaveDays: 0,
    yearlyQuotaDays: 10,
    totalLeaveEntitled: 10,
    usedLeaveDays: 0,
    phone: '',
    email: '',
    status: 'active'
  });

  const filteredUsers = users.filter(user => {
    if (selectedGroup !== 'all' && user.departmentGroup !== selectedGroup) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const fullName = `${user.title}${user.firstName} ${user.lastName}`.toLowerCase();
      const pos = user.position.toLowerCase();
      return fullName.includes(q) || pos.includes(q);
    }
    return true;
  });

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({
      citizenId: '',
      title: 'นาย',
      firstName: '',
      lastName: '',
      departmentGroup: 'ข้าราชการ+ลูกจ้าง',
      position: 'พนักงานมหาวิทยาลัย',
      accumulatedLeaveDays: 5,
      yearlyQuotaDays: 10,
      totalLeaveEntitled: 15,
      usedLeaveDays: 0,
      phone: '',
      email: '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: UserPersonnel) => {
    setEditingUser(user);
    setFormData({ ...user });
    setIsModalOpen(true);
  };

  const handleLeaveInputChange = (field: 'accumulatedLeaveDays' | 'yearlyQuotaDays' | 'usedLeaveDays', value: number) => {
    const acc = field === 'accumulatedLeaveDays' ? value : (formData.accumulatedLeaveDays || 0);
    const quota = field === 'yearlyQuotaDays' ? value : (formData.yearlyQuotaDays || 10);
    const total = acc + quota;
    setFormData(prev => ({
      ...prev,
      [field]: value,
      totalLeaveEntitled: total
    }));
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      alertHelper.error('กรุณากรอกข้อมูล', 'กรุณากรอกชื่อและนามสกุลของบุคลากร');
      return;
    }

    const currentUsers = storageService.getUsers();
    const acc = Number(formData.accumulatedLeaveDays) || 0;
    const quota = Number(formData.yearlyQuotaDays) || 10;
    const total = acc + quota;
    const used = Number(formData.usedLeaveDays) || 0;

    if (editingUser) {
      // Edit
      const updatedList = currentUsers.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            ...formData,
            accumulatedLeaveDays: acc,
            yearlyQuotaDays: quota,
            totalLeaveEntitled: total,
            usedLeaveDays: used
          } as UserPersonnel;
        }
        return u;
      });
      storageService.saveUsers(updatedList);
      alertHelper.success('บันทึกสำเร็จ', `แก้ไขข้อมูล ${formData.title}${formData.firstName} ${formData.lastName} เรียบร้อยแล้ว`);
    } else {
      // Add
      const newUser: UserPersonnel = {
        id: `u_${Date.now()}`,
        citizenId: formData.citizenId || '',
        title: formData.title || 'นาย',
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        departmentGroup: formData.departmentGroup || 'ข้าราชการ+ลูกจ้าง',
        position: formData.position || 'พนักงานมหาวิทยาลัย',
        academicRank: formData.academicRank || '',
        accumulatedLeaveDays: acc,
        yearlyQuotaDays: quota,
        totalLeaveEntitled: total,
        usedLeaveDays: used,
        phone: formData.phone || '',
        email: formData.email || '',
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        status: 'active'
      };
      storageService.saveUsers([...currentUsers, newUser]);
      alertHelper.success('เพิ่มบุคลากรสำเร็จ', `เพิ่ม ${newUser.title}${newUser.firstName} ${newUser.lastName} เข้าสู่ระบบแล้ว`);
    }

    setIsModalOpen(false);
    onRefreshData();
  };

  const handleDeleteUser = async (user: UserPersonnel) => {
    const confirmed = await alertHelper.confirm(
      'ยืนยันการลบข้อมูล',
      `ท่านแน่ใจหรือไม่ว่าต้องการลบข้อมูลของ "${user.title}${user.firstName} ${user.lastName}" ออกจากระบบ?`,
      'ยืนยันการลบ'
    );

    if (confirmed) {
      const currentUsers = storageService.getUsers();
      const updatedList = currentUsers.filter(u => u.id !== user.id);
      storageService.saveUsers(updatedList);
      onRefreshData();
      alertHelper.toastSuccess('ลบข้อมูลบุคลากรเรียบร้อยแล้ว');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card & Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-users text-blue-800"></i>
            <span>หน้าจัดการข้อมูลผู้ใช้และวันลาสะสม</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            บันทึกประวัติบุคลากร สังกัดกลุ่มงาน (3 กลุ่ม) ตำแหน่ง และสิทธิ์วันลาพักผ่อนสะสมประจำปีงบประมาณ พ.ศ. {settings.currentFiscalYear}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="bg-blue-900 hover:bg-blue-950 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <i className="fa-solid fa-user-plus text-amber-400"></i>
            <span>เพิ่มบุคลากรใหม่</span>
          </button>
        </div>
      </div>

      {/* Summary Cards by 3 Department Groups */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {DEPARTMENT_GROUPS.map((grp, gIdx) => {
          const count = users.filter(u => u.departmentGroup === grp).length;
          return (
            <div
              key={grp}
              onClick={() => setSelectedGroup(selectedGroup === grp ? 'all' : grp)}
              className={`p-3.5 rounded-xl border transition cursor-pointer ${
                selectedGroup === grp
                  ? 'bg-blue-950 text-white border-blue-950 shadow-md ring-2 ring-amber-400'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-[10px]">
                  {gIdx + 1}
                </span>
                <span className="truncate">{grp}</span>
              </div>
              <div className="flex items-baseline justify-between mt-2 pl-6">
                <span className="text-2xl font-bold">{count}</span>
                <span className="text-xs opacity-75">ท่าน</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
            <i className="fa-solid fa-filter text-blue-800"></i>
            <span>กรองกลุ่มงาน:</span>
          </label>
          <div className="relative min-w-[260px] sm:min-w-[300px]">
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 cursor-pointer shadow-xs hover:border-slate-400 transition"
            >
              <option value="all">ทั้งหมดทุกกลุ่มงาน ({users.length} ท่าน)</option>
              {DEPARTMENT_GROUPS.map((grp, gIdx) => {
                const count = users.filter(u => u.departmentGroup === grp).length;
                return (
                  <option key={grp} value={grp}>
                    {gIdx + 1}. {grp} ({count} ท่าน)
                  </option>
                );
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
              <i className="fa-solid fa-chevron-down text-[10px]"></i>
            </div>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-xs"></i>
          <input
            type="text"
            placeholder="ค้นหาชื่อ-นามสกุล, ตำแหน่ง..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider border-b border-slate-200 text-[11px] font-bold">
                <th className="py-3 px-3 text-center w-12">ลำดับ</th>
                <th className="py-3 px-3">ชื่อ - สกุล</th>
                <th className="py-3 px-3">กลุ่มงาน</th>
                <th className="py-3 px-3">ตำแหน่ง</th>
                <th className="py-3 px-3 text-center bg-blue-50/50 w-24">สะสมยกมา</th>
                <th className="py-3 px-3 text-center bg-blue-50/50 w-24">สิทธิ์ปีนี้</th>
                <th className="py-3 px-3 text-center bg-blue-50/50 w-24">ใช้ไปแล้ว</th>
                <th className="py-3 px-3 text-center bg-emerald-50/70 text-emerald-900 w-24">คงเหลือสุทธิ</th>
                <th className="py-3 px-3 text-center w-28">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    <i className="fa-regular fa-folder-open text-2xl mb-1 block"></i>
                    ไม่พบข้อมูลบุคลากรที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => {
                  const remaining = Math.max(0, user.totalLeaveEntitled - user.usedLeaveDays);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 text-center font-medium text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 text-[13px]">
                          {user.title}{user.firstName} {user.lastName}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                          {user.departmentGroup}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {user.position}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold bg-blue-50/30">
                        {user.accumulatedLeaveDays} วัน
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold bg-blue-50/30">
                        {user.yearlyQuotaDays} วัน
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold text-rose-700 bg-blue-50/30">
                        {user.usedLeaveDays} วัน
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-800 bg-emerald-50/50">
                        {remaining} วัน
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(user)}
                            className="w-7 h-7 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center cursor-pointer transition"
                            title="แก้ไขข้อมูล"
                          >
                            <i className="fa-solid fa-pen-to-square text-xs"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="w-7 h-7 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center cursor-pointer transition"
                            title="ลบข้อมูล"
                          >
                            <i className="fa-solid fa-trash-can text-xs"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-950 to-indigo-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <i className="fa-solid fa-user-pen text-amber-400 text-lg"></i>
                <h3 className="font-bold text-base">
                  {editingUser ? 'แก้ไขข้อมูลบุคลากร' : 'เพิ่มบุคลากรใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-blue-200 hover:text-white text-lg cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">
                    คำนำหน้าชื่อ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="นาย, นาง, นางสาว, ผศ.ดร."
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block font-semibold text-slate-700 mb-1">
                    ชื่อ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="ชื่อจริง"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block font-semibold text-slate-700 mb-1">
                    นามสกุล <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="นามสกุล"
                  />
                </div>
              </div>

              {/* กลุ่มงาน และ ตำแหน่ง ตามโจทย์ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                <div>
                  <label className="block font-bold text-amber-950 mb-1">
                    กลุ่มงาน (ตามระเบียบ) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.departmentGroup}
                    onChange={e => {
                      const newGroup = e.target.value as DepartmentGroup;
                      const available = POSITIONS_BY_GROUP[newGroup] || [];
                      const defaultPos: PositionType = available[0] || 'พนักงานมหาวิทยาลัย';
                      setFormData(prev => ({
                        ...prev,
                        departmentGroup: newGroup,
                        position: (prev.position && available.includes(prev.position as PositionType)) ? prev.position : defaultPos
                      }));
                    }}
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-medium cursor-pointer"
                  >
                    {DEPARTMENT_GROUPS.map(grp => (
                      <option key={grp} value={grp}>{grp}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-amber-950 mb-1">
                    ตำแหน่งงาน <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.position}
                    onChange={e => setFormData({ ...formData, position: e.target.value as PositionType })}
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-medium cursor-pointer"
                  >
                    {((formData.departmentGroup && POSITIONS_BY_GROUP[formData.departmentGroup as DepartmentGroup]) || []).map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-amber-700 mt-1">
                    <i className="fa-solid fa-circle-check text-[9px] mr-1"></i>
                    แสดงตำแหน่งเฉพาะของ: {formData.departmentGroup}
                  </p>
                </div>
              </div>

              {/* วันลาสะสม */}
              <div className="border border-blue-200 bg-blue-50/40 p-4 rounded-xl space-y-3">
                <div className="font-bold text-blue-950 text-xs flex items-center justify-between">
                  <span>สิทธิ์วันลาพักผ่อนประจำปีงบประมาณ พ.ศ. {settings.currentFiscalYear}</span>
                  <span className="text-blue-700">คำนวณตามระเบียบสำนักนายกรัฐมนตรี</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      วันลาสะสมยกมา (วัน)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={formData.accumulatedLeaveDays}
                      onChange={e => handleLeaveInputChange('accumulatedLeaveDays', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-blue-300 rounded-lg text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      สิทธิ์ปีนี้ (วัน)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="20"
                      value={formData.yearlyQuotaDays}
                      onChange={e => handleLeaveInputChange('yearlyQuotaDays', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-blue-300 rounded-lg text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-rose-700 mb-1">
                      ใช้ไปแล้ว (วัน)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.usedLeaveDays}
                      onChange={e => handleLeaveInputChange('usedLeaveDays', parseFloat(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-rose-300 rounded-lg text-center font-bold text-rose-700"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-800 mb-1">
                      คงเหลือสุทธิ (วัน)
                    </label>
                    <div className="w-full p-2 bg-emerald-100 border border-emerald-300 rounded-lg text-center font-extrabold text-emerald-900 text-sm">
                      {Math.max(0, ((formData.accumulatedLeaveDays || 0) + (formData.yearlyQuotaDays || 10)) - (formData.usedLeaveDays || 0))} วัน
                    </div>
                  </div>
                </div>
              </div>

              {/* ข้อมูลติดต่อ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์ติดต่อ
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="เช่น 081-234-5678"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    อีเมล (Email)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="เช่น user@ku.ac.th"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-bold shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  <i className="fa-solid fa-floppy-disk text-amber-400"></i>
                  <span>บันทึกข้อมูลบุคลากร</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
