import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { AdminOptions, AppUser, UserRole } from '../types';
import { Plus, X, Users, Settings, Eye, EyeOff } from 'lucide-react';
import { cn } from '../utils';

export function AdminPanel() {
  const { adminOptions, setAdminOptions, users, setUsers } = useAppContext();
  const [activeSection, setActiveSection] = useState<'options' | 'users'>('users');
  const [newItems, setNewItems] = useState<Record<keyof AdminOptions, string>>({
    clients: '', seoOwners: '', contentOwners: '', webOwners: '',
    seoStages: '', seoQcStatuses: '', contentStatuses: '', webStatuses: ''
  });

  // User form state
  const [userForm, setUserForm] = useState<{ name: string; password: string; role: UserRole; ownerName: string }>({
    name: '', password: '', role: 'seo', ownerName: ''
  });
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AppUser>>({});

  const ownerOptions: Record<UserRole, string[]> = {
    admin: [],
    seo: adminOptions.seoOwners,
    content: adminOptions.contentOwners,
    web: adminOptions.webOwners,
  };

  const roleColors: Record<UserRole, string> = {
    admin: 'bg-red-100 text-red-700',
    seo: 'bg-blue-100 text-blue-700',
    content: 'bg-orange-100 text-orange-700',
    web: 'bg-emerald-100 text-emerald-700',
  };

  const handleAddUser = () => {
    if (!userForm.name.trim() || !userForm.password.trim()) return;
    if (userForm.role !== 'admin' && !userForm.ownerName) return;
    const newUser: AppUser = {
      id: `user-${Date.now()}`,
      name: userForm.name.trim(),
      password: userForm.password.trim(),
      role: userForm.role,
      ownerName: userForm.role === 'admin' ? '' : userForm.ownerName,
    };
    setUsers(prev => [...prev, newUser]);
    setUserForm({ name: '', password: '', role: 'seo', ownerName: '' });
  };

  const handleDeleteUser = (id: string) => {
    if (id === 'admin') return; // protect default admin
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleSaveEdit = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...editForm } : u));
    setEditingUser(null); setEditForm({});
  };

  const toggleShowPassword = (id: string) => {
    setShowPasswords(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleAdd = (key: keyof AdminOptions) => {
    if (!newItems[key].trim()) return;
    setAdminOptions(prev => ({ ...prev, [key]: [...prev[key], newItems[key].trim()] }));
    setNewItems(prev => ({ ...prev, [key]: '' }));
  };

  const handleRemove = (key: keyof AdminOptions, index: number) => {
    setAdminOptions(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  };

  const renderSection = (title: string, key: keyof AdminOptions) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200 flex flex-col h-72">
      <h3 className="font-semibold text-zinc-800 mb-3 text-sm">{title}</h3>
      <div className="flex gap-2 mb-3">
        <input type="text" value={newItems[key]} onChange={e => setNewItems(prev => ({ ...prev, [key]: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && handleAdd(key)}
          className="flex-1 border-zinc-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm p-2 border" placeholder="Add new..." />
        <button onClick={() => handleAdd(key)} className="bg-emerald-500 text-white p-2 rounded-md hover:bg-emerald-600"><Plus size={18} /></button>
      </div>
      <ul className="space-y-1.5 overflow-y-auto flex-1 pr-1">
        {adminOptions[key].map((item, i) => (
          <li key={i} className="flex items-center justify-between bg-zinc-50 p-2 rounded-md text-sm border border-zinc-100">
            <span className="truncate mr-2">{item}</span>
            <button onClick={() => handleRemove(key, i)} className="text-red-400 hover:text-red-600 shrink-0"><X size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-800">Admin Panel</h2>
        <div className="flex bg-zinc-100 p-1 rounded-lg gap-1">
          <button onClick={() => setActiveSection('users')} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors", activeSection === 'users' ? "bg-white shadow-sm text-indigo-600" : "text-zinc-500")}>
            <Users size={15} /> Users
          </button>
          <button onClick={() => setActiveSection('options')} className={cn("flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors", activeSection === 'options' ? "bg-white shadow-sm text-indigo-600" : "text-zinc-500")}>
            <Settings size={15} /> Dropdown Options
          </button>
        </div>
      </div>

      {activeSection === 'users' && (
        <div className="space-y-4">
          {/* Add user form */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm">
            <h3 className="font-semibold text-zinc-800 mb-4">Add New User</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Full Name</label>
                <input type="text" placeholder="e.g. Imran" value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Password</label>
                <input type="text" placeholder="Set a password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Role</label>
                <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value as UserRole, ownerName: '' }))}
                  className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="admin">Admin</option>
                  <option value="seo">SEO</option>
                  <option value="content">Content</option>
                  <option value="web">Web</option>
                </select>
              </div>
              {userForm.role !== 'admin' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Linked Owner Name</label>
                  <select value={userForm.ownerName} onChange={e => setUserForm(f => ({ ...f, ownerName: e.target.value }))}
                    className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select owner...</option>
                    {ownerOptions[userForm.role].map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}
            </div>
            <button onClick={handleAddUser} disabled={!userForm.name || !userForm.password || (userForm.role !== 'admin' && !userForm.ownerName)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
              <Plus size={16} /> Add User
            </button>
          </div>

          {/* Users table */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Linked Owner</th>
                  <th className="px-4 py-3 font-medium">Password</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-zinc-50">
                    {editingUser === user.id ? (
                      <>
                        <td className="px-4 py-2"><input value={editForm.name || user.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="border border-zinc-300 rounded-md px-2 py-1 text-sm w-full" /></td>
                        <td className="px-4 py-2">
                          <select value={editForm.role || user.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as UserRole }))} className="border border-zinc-300 rounded-md px-2 py-1 text-sm">
                            {(['admin','seo','content','web'] as UserRole[]).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2"><input value={editForm.ownerName ?? user.ownerName} onChange={e => setEditForm(f => ({ ...f, ownerName: e.target.value }))} className="border border-zinc-300 rounded-md px-2 py-1 text-sm w-full" /></td>
                        <td className="px-4 py-2"><input value={editForm.password ?? user.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} className="border border-zinc-300 rounded-md px-2 py-1 text-sm w-full" /></td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleSaveEdit(user.id)} className="px-3 py-1 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700">Save</button>
                            <button onClick={() => { setEditingUser(null); setEditForm({}); }} className="px-3 py-1 bg-zinc-100 text-zinc-600 text-xs rounded-md hover:bg-zinc-200">Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-zinc-900">{user.name}</td>
                        <td className="px-4 py-3"><span className={cn("text-xs font-bold px-2 py-1 rounded-md capitalize", roleColors[user.role])}>{user.role}</span></td>
                        <td className="px-4 py-3 text-zinc-600">{user.ownerName || <span className="text-zinc-300">—</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 font-mono text-xs">{showPasswords.has(user.id) ? user.password : '••••••••'}</span>
                            <button onClick={() => toggleShowPassword(user.id)} className="text-zinc-400 hover:text-zinc-600">
                              {showPasswords.has(user.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => { setEditingUser(user.id); setEditForm({ name: user.name, role: user.role, ownerName: user.ownerName, password: user.password }); }}
                              className="px-3 py-1 bg-zinc-100 text-zinc-600 text-xs rounded-md hover:bg-zinc-200">Edit</button>
                            {user.id !== 'admin' && (
                              <button onClick={() => handleDeleteUser(user.id)} className="px-3 py-1 bg-red-50 text-red-600 text-xs rounded-md hover:bg-red-100">Delete</button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-400">Users are stored in the database. Passwords are plain-text — this is an internal team tool not exposed to the public.</p>
        </div>
      )}

      {activeSection === 'options' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {renderSection('Clients', 'clients')}
          {renderSection('SEO Owners', 'seoOwners')}
          {renderSection('Content Owners', 'contentOwners')}
          {renderSection('Web Owners', 'webOwners')}
          {renderSection('SEO Stages', 'seoStages')}
          {renderSection('SEO QC Statuses', 'seoQcStatuses')}
          {renderSection('Content Statuses', 'contentStatuses')}
          {renderSection('Web Statuses', 'webStatuses')}
        </div>
      )}
    </div>
  );
}
