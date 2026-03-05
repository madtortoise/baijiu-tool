/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Package, DollarSign, Image as ImageIcon, X, Filter, ChevronDown, ChevronUp, Edit2, Trash2, CheckSquare, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Item {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  created_at: string;
}

const PRICE_RANGES = [
  { label: '0-100', value: '0-100' },
  { label: '100-200', value: '100-200' },
  { label: '200-300', value: '200-300' },
  { label: '300-400', value: '300-400' },
  { label: '400以上', value: '400+' },
];

export default function App() {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [industryName, setIndustryName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isEditAdminModalOpen, setIsEditAdminModalOpen] = useState(false);
  const [editAdminForm, setEditAdminForm] = useState({
    adminPassword: '',
    subUserPassword: '',
  });
  const [registerForm, setRegisterForm] = useState({
    industryName: '',
    adminPassword: '',
    subUserPassword: '',
  });

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRanges, setSelectedRanges] = useState<string[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const filterRef = useRef<HTMLDivElement>(null);

  // Form state
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    image: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsLoggedIn(true);
        setAccountId(data.accountId);
        setIndustryName(data.industryName);
        setIsAdmin(data.userType === 'admin');
        setLoginPassword('');
      } else {
        const error = await response.json();
        alert(error.error || '登录失败，请重试');
        setLoginPassword('');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('网络错误，登录失败');
      setLoginPassword('');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;

    if (!editAdminForm.adminPassword && !editAdminForm.subUserPassword) {
      alert('至少需要修改一个密码');
      return;
    }

    if (editAdminForm.adminPassword && editAdminForm.adminPassword.length > 10) {
      alert('管理员密码不能超过10个字符');
      return;
    }

    if (editAdminForm.subUserPassword && editAdminForm.subUserPassword.length > 10) {
      alert('子用户密码不能超过10个字符');
      return;
    }

    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          adminPassword: editAdminForm.adminPassword || undefined,
          subUserPassword: editAdminForm.subUserPassword || undefined,
        }),
      });

      if (response.ok) {
        alert('密码已更新，请使用新密码重新登录');
        setIsEditAdminModalOpen(false);
        setEditAdminForm({ adminPassword: '', subUserPassword: '' });
        // 登出用户
        setIsLoggedIn(false);
        setAccountId(null);
        setIndustryName('');
        setIsAdmin(false);
        setSelectedIds([]);
        setItems([]);
      } else {
        const error = await response.json();
        alert(error.error || '更新密码失败，请重试');
      }
    } catch (error) {
      console.error('Update password error:', error);
      alert('网络错误，更新失败');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerForm.industryName || !registerForm.adminPassword || !registerForm.subUserPassword) {
      alert('请填写全部字段');
      return;
    }

    if (registerForm.adminPassword.length > 10 || registerForm.subUserPassword.length > 10) {
      alert('密码不能超过10个字符');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industryName: registerForm.industryName,
          adminPassword: registerForm.adminPassword,
          subUserPassword: registerForm.subUserPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('注册成功！现在可以使用管理员密码或子用户密码登录');
        setIsRegisterModalOpen(false);
        setRegisterForm({ industryName: '', adminPassword: '', subUserPassword: '' });
      } else {
        const error = await response.json();
        alert(error.error || '注册失败，请重试');
      }
    } catch (error) {
      console.error('Register error:', error);
      alert('网络错误，注册失败');
    }
  };

  // Close filter on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchItems = useCallback(async () => {
    if (!accountId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('name', searchTerm);
      if (selectedRanges.length > 0) params.append('priceRanges', selectedRanges.join(','));
      params.append('accountId', accountId.toString());
      params.append('_t', Date.now().toString());
      
      const response = await fetch(`/api/items?${params.toString()}`);
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedRanges, accountId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;
    
    try {
      const url = editingId ? `/api/items/${editingId}` : '/api/items';
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          price: parseFloat(newItem.price),
          stock: parseInt(newItem.stock),
          accountId,
        }),
      });
      if (response.ok) {
        setIsUploadModalOpen(false);
        setEditingId(null);
        setNewItem({ name: '', description: '', price: '', stock: '', image: '' });
        fetchItems();
      }
    } catch (error) {
      console.error('Operation failed:', error);
    }
  };

  const openEditModal = (item: Item) => {
    setEditingId(item.id);
    setNewItem({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      stock: item.stock.toString(),
      image: item.image_url || '',
    });
    setIsUploadModalOpen(true);
  };

  const openUploadModal = () => {
    setEditingId(null);
    setNewItem({ name: '', description: '', price: '', stock: '', image: '' });
    setIsUploadModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem({ ...newItem, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleRange = (range: string) => {
    setSelectedRanges(prev => 
      prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
    );
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这瓶酒吗？')) return;
    if (!accountId) return;
    
    try {
      const response = await fetch(`/api/items/${id}?accountId=${accountId}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchItems();
        setSelectedIds(prev => prev.filter(i => i !== id));
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('网络错误，删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个酒品吗？`)) return;
    if (!accountId) return;
    
    try {
      const response = await fetch('/api/items/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, accountId }),
      });
      if (response.ok) {
        await fetchItems();
        setSelectedIds([]);
      } else {
        alert('批量删除失败，请重试');
      }
    } catch (error) {
      console.error('Batch delete failed:', error);
      alert('网络错误，批量删除失败');
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const allVisibleSelected = items.length > 0 && items.every(item => selectedIds.includes(item.id));
    if (allVisibleSelected) {
      const visibleIds = items.map(item => item.id);
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      const visibleIds = items.map(item => item.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      {!isLoggedIn ? (
        // Login Screen
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
              <div className="text-center">
                <div className="text-5xl mb-99">🍶</div>
                <h1 className="text-3xl font-bold text-stone-900">白酒工具</h1>
                <p className="text-stone-500 mt-2">白酒库存管理系统</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">访问密码</label>
                  <input 
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="请输入访问密码"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    autoFocus
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/10 transition-all active:scale-[0.98]"
                >
                  进入系统
                </button>
              </form>

              <button 
                onClick={() => setIsRegisterModalOpen(true)}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 rounded-xl transition-all active:scale-[0.98]"
              >
                注册管理员账户
              </button>

              <p className="text-center text-sm text-stone-500">
                © 2026 白酒工具系统
              </p>
            </div>

            {/* Register Modal */}
            <AnimatePresence>
              {isRegisterModalOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
                  onClick={() => setIsRegisterModalOpen(false)}
                >
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-stone-900">注册管理员账户</h2>
                      <button 
                        onClick={() => setIsRegisterModalOpen(false)}
                        className="text-stone-400 hover:text-stone-600"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">行业名称</label>
                        <input 
                          type="text"
                          value={registerForm.industryName}
                          onChange={(e) => setRegisterForm({ ...registerForm, industryName: e.target.value })}
                          placeholder="例如：XX酒厂"
                          className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">管理员密码</label>
                        <input 
                          type="password"
                          value={registerForm.adminPassword}
                          onChange={(e) => setRegisterForm({ ...registerForm, adminPassword: e.target.value })}
                          placeholder="10位以内的字母数字特殊字符"
                          maxLength={10}
                          className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          required
                        />
                        <p className="text-xs text-stone-500 mt-1">用于管理员登录</p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">子用户密码</label>
                        <input 
                          type="password"
                          value={registerForm.subUserPassword}
                          onChange={(e) => setRegisterForm({ ...registerForm, subUserPassword: e.target.value })}
                          placeholder="10位以内的字母数字特殊字符"
                          maxLength={10}
                          className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          required
                        />
                        <p className="text-xs text-stone-500 mt-1">用于子用户登录</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                          type="button"
                          onClick={() => setIsRegisterModalOpen(false)}
                          className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all"
                        >
                          取消
                        </button>
                        <button 
                          type="submit"
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/10 transition-all"
                        >
                          注册
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      ) : (
        // Main Application
        <>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <Package size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">详情共享</h1>
              <p className="text-xs text-stone-500">{industryName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && selectedIds.length > 0 && (
              <button 
                onClick={handleBatchDelete}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-full transition-all active:scale-95 border border-red-200"
              >
                <Trash2 size={18} />
                <span className="text-sm font-bold">批量删除 ({selectedIds.length})</span>
              </button>
            )}
            {isAdmin && (
              <button 
                onClick={openUploadModal}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full transition-all active:scale-95 shadow-sm"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">上传</span>
              </button>
            )}
            {isAdmin && (
              <button 
                onClick={() => setIsEditAdminModalOpen(true)}
                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-full transition-all active:scale-95 border border-blue-200"
                title="编辑管理员信息"
              >
                <Edit2 size={18} />
                <span className="hidden sm:inline text-sm font-medium">管理员</span>
              </button>
            )}
            <button 
              onClick={() => {
                setIsLoggedIn(false);
                setAccountId(null);
                setIndustryName('');
                setIsAdmin(false);
                setSelectedIds([]);
                setItems([]);
              }}
              className="flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-full transition-all active:scale-95"
              title="登出"
            >
              <X size={18} />
              <span className="hidden sm:inline text-sm font-medium">登出</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex gap-2 items-stretch">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
              <input 
                type="text"
                placeholder="搜索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
              />
            </div>
            
            {/* First row: Select All, Filter and Refresh */}
            {isAdmin && (
              <button 
                onClick={toggleSelectAll}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all shadow-sm whitespace-nowrap ${
                  items.length > 0 && items.every(item => selectedIds.includes(item.id))
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-white border-stone-200 hover:bg-stone-50'
                }`}
              >
                <CheckSquare size={18} />
                <span className="text-sm font-medium">全选</span>
              </button>
            )}

            <div className="relative" ref={filterRef}>
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all shadow-sm whitespace-nowrap ${
                  selectedRanges.length > 0 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-white border-stone-200 hover:bg-stone-50'
                }`}
              >
                <Filter size={18} />
                <span>价格区间</span>
                {selectedRanges.length > 0 && (
                  <span className="bg-emerald-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {selectedRanges.length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-stone-200 rounded-2xl shadow-xl z-20 p-4"
                  >
                    <div className="space-y-2">
                      {PRICE_RANGES.map((range) => (
                        <label key={range.value} className="flex items-center gap-3 p-2 hover:bg-stone-50 rounded-lg cursor-pointer transition-colors">
                          <input 
                            type="checkbox"
                            checked={selectedRanges.includes(range.value)}
                            onChange={() => toggleRange(range.value)}
                            className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm font-medium">{range.label}</span>
                        </label>
                      ))}
                    </div>
                    {selectedRanges.length > 0 && (
                      <button 
                        onClick={() => setSelectedRanges([])}
                        className="w-full mt-4 text-xs text-stone-500 hover:text-emerald-600 font-medium text-center"
                    >
                      清除全部
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            </div>

            <button 
              onClick={fetchItems}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl border bg-white border-stone-200 hover:bg-stone-50 transition-all shadow-sm whitespace-nowrap"
              title="刷新数据"
            >
              <RotateCcw size={18} />
              <span className="text-sm font-medium">刷新</span>
            </button>
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-white rounded-3xl border border-stone-200 h-[400px] animate-pulse" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={item.id}
                className="group bg-white rounded-3xl border border-stone-200 overflow-hidden hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300"
              >
                <div className="aspect-[4/3] bg-stone-100 relative overflow-hidden">
                  {isAdmin && (
                    <div className="absolute top-4 left-4 z-10">
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="w-5 h-5 rounded-lg border-white/20 bg-white/40 backdrop-blur text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                  )}
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <ImageIcon size={48} />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-emerald-700 shadow-sm">
                    库存: {item.stock}
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-stone-800 line-clamp-1">{item.name}</h3>
                    <div className="text-emerald-600 font-bold text-lg">
                      ¥{item.price.toFixed(2)}
                    </div>
                  </div>
                  <p className="text-stone-500 text-sm line-clamp-2 mb-4 h-10">
                    {item.description || '暂无描述'}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                    <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    {isAdmin && (
                      <div className="flex gap-3">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="text-stone-400 hover:text-emerald-600 transition-colors"
                          title="编辑"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="text-stone-400 hover:text-red-500 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-300">
              <Package size={40} />
            </div>
            <h3 className="text-xl font-semibold text-stone-800">未找到相关酒品</h3>
            <p className="text-stone-500 mt-2">尝试更换搜索词或筛选条件</p>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-stone-800">
                    {editingId ? '编辑酒品' : '上传新酒品'}
                  </h2>
                  <button onClick={() => setIsUploadModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleUpload} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">图片</label>
                    <div className="relative aspect-video bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden group hover:border-emerald-300 transition-colors cursor-pointer">
                      {newItem.image ? (
                        <>
                          <img src={newItem.image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); setNewItem({ ...newItem, image: '' }); }}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-stone-600 hover:text-red-500 shadow-sm"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center text-stone-400">
                          <ImageIcon size={32} className="mb-2" />
                          <span className="text-sm">点击或拖拽上传图片</span>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">名称</label>
                    <input 
                      required
                      type="text"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="输入酒名"
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">价格 (¥)</label>
                      <input 
                        required
                        type="number"
                        step="0.01"
                        value={newItem.price}
                        onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">存量</label>
                      <input 
                        required
                        type="number"
                        min="0"
                        value={newItem.stock}
                        onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">描述</label>
                    <textarea 
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="添加一些描述信息..."
                      rows={3}
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-900/10 transition-all active:scale-[0.98] mt-4"
                  >
                    {editingId ? '保存修改' : '确认上传'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Admin Modal */}
      <AnimatePresence>
        {isEditAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditAdminModalOpen(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-stone-800">管理员设置</h2>
                  <button onClick={() => setIsEditAdminModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">管理员登录密码</label>
                    <input 
                      type="password"
                      value={editAdminForm.adminPassword}
                      onChange={(e) => setEditAdminForm({ ...editAdminForm, adminPassword: e.target.value })}
                      placeholder="留空则不修改"
                      maxLength={10}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <p className="text-xs text-stone-500 mt-1">用于管理员登录，最多10个字符</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">子用户登录密码</label>
                    <input 
                      type="password"
                      value={editAdminForm.subUserPassword}
                      onChange={(e) => setEditAdminForm({ ...editAdminForm, subUserPassword: e.target.value })}
                      placeholder="留空则不修改"
                      maxLength={10}
                      className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <p className="text-xs text-stone-500 mt-1">用于子用户登录，最多10个字符</p>
                  </div>

                  <div className="pt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700 font-medium">ℹ️ 密码修改后，您需要使用新密码重新登录系统。</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsEditAdminModalOpen(false);
                        setEditAdminForm({ adminPassword: '', subUserPassword: '' });
                      }}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-all"
                    >
                      取消
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-900/10 transition-all"
                    >
                      保存修改
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}
