'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit3,
  Trash2,
  Move,
  Check,
  X,
  AlertTriangle,
  Palette,
  Percent,
  Target,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface BudgetCategory {
  id: string;
  name: string;
  targetPercentage: number;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const BudgetCategoriesPage = () => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    targetPercentage: 0,
    color: '#FFD166'
  });
  const [editedCategory, setEditedCategory] = useState<Partial<BudgetCategory>>({});

  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery<BudgetCategory[]>({
    queryKey: ['budget', 'categories'],
    queryFn: async () => {
      const response = await fetch('/api/budget-categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (category: { name: string; targetPercentage: number; color: string }) => {
      const response = await fetch('/api/budget-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
      });
      if (!response.ok) throw new Error('Failed to create category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', 'categories'] });
      setShowCreateForm(false);
      setNewCategory({ name: '', targetPercentage: 0, color: '#FFD166' });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<BudgetCategory>) => {
      const response = await fetch(`/api/budget-categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', 'categories'] });
      setEditingCategory(null);
      setEditedCategory({});
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/budget-categories/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete category');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', 'categories'] });
    },
  });

  const validatePercentagesMutation = useMutation({
    mutationFn: async (percentages: { id?: string; targetPercentage: number }[]) => {
      const response = await fetch('/api/budget-categories/validate-percentages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentages }),
      });
      if (!response.ok) throw new Error('Failed to validate percentages');
      return response.json();
    },
  });

  const totalPercentage = categories.reduce((sum, cat) => sum + cat.targetPercentage, 0);
  const isValidTotal = totalPercentage === 100;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name.trim() || newCategory.targetPercentage <= 0) return;

    await createCategoryMutation.mutateAsync(newCategory);
  };

  const handleUpdateCategory = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (!category) return;

    const updates = { ...category, ...editedCategory };
    await updateCategoryMutation.mutateAsync({ id, ...updates });
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      await deleteCategoryMutation.mutateAsync(id);
    }
  };

  const startEditing = (category: BudgetCategory) => {
    setEditingCategory(category.id);
    setEditedCategory(category);
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setEditedCategory({});
  };

  const predefinedColors = [
    '#FFD166', '#8FAD77', '#5E7F9B', '#F06292', '#9C27B0',
    '#673AB7', '#3F51B5', '#2196F3', '#00BCD4', '#009688',
    '#4CAF50', '#8BC34A', '#CDDC39', '#FFC107', '#FF9800',
    '#FF5722', '#795548', '#9E9E9E', '#607D8B'
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-700 rounded w-64"></div>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link
              href="/budget"
              className="mr-4 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Budget Categories</h1>
              <p className="text-slate-400">
                Manage your budget categories and allocation percentages
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </button>
        </div>

        {/* Percentage Summary */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Total Allocation</h2>
            <div className="flex items-center">
              {isValidTotal ? (
                <Check className="w-5 h-5 text-[#8FAD77] mr-2" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-[#FFD166] mr-2" />
              )}
              <span className={`text-lg font-bold ${isValidTotal ? 'text-[#8FAD77]' : 'text-[#FFD166]'}`}>
                {totalPercentage}%
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                isValidTotal ? 'bg-[#8FAD77]' : totalPercentage > 100 ? 'bg-red-500' : 'bg-[#FFD166]'
              }`}
              style={{ width: `${Math.min(totalPercentage, 100)}%` }}
            ></div>
          </div>

          <p className="text-sm text-slate-400">
            {isValidTotal
              ? 'Perfect! Your categories total 100%'
              : totalPercentage > 100
                ? `Over-allocated by ${totalPercentage - 100}%`
                : `Under-allocated by ${100 - totalPercentage}%`
            }
          </p>
        </div>

        {/* Create Category Form */}
        {showCreateForm && (
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                  placeholder="e.g., Needs, Wants, Savings"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Target Percentage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newCategory.targetPercentage}
                    onChange={(e) => setNewCategory({ ...newCategory, targetPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                    placeholder="0"
                    required
                  />
                  <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategory({ ...newCategory, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newCategory.color === color
                          ? 'border-white scale-110'
                          : 'border-white/30 hover:border-white/60'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  className="w-full h-10 bg-white/10 border border-white/20 rounded-lg cursor-pointer"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewCategory({ name: '', targetPercentage: 0, color: '#FFD166' });
                  }}
                  className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCategoryMutation.isPending}
                  className="px-4 py-2 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors disabled:opacity-50"
                >
                  {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Categories List */}
        <div className="space-y-4">
          {categories.length === 0 ? (
            <div className="text-center py-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl">
              <Target className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Budget Categories</h3>
              <p className="text-slate-400 mb-6">
                Create your first budget category to start organizing your finances.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-6 py-3 bg-[#FFD166] text-slate-900 font-semibold rounded-lg hover:bg-[#FFD166]/90 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create First Category
              </button>
            </div>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6"
              >
                {editingCategory === category.id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Category Name
                      </label>
                      <input
                        type="text"
                        value={editedCategory.name || ''}
                        onChange={(e) => setEditedCategory({ ...editedCategory, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Target Percentage
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={editedCategory.targetPercentage || 0}
                          onChange={(e) => setEditedCategory({ ...editedCategory, targetPercentage: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFD166] focus:border-transparent"
                        />
                        <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Color
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {predefinedColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditedCategory({ ...editedCategory, color })}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              editedCategory.color === color
                                ? 'border-white scale-110'
                                : 'border-white/30 hover:border-white/60'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={cancelEditing}
                        className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateCategory(category.id)}
                        disabled={updateCategoryMutation.isPending}
                        className="px-4 py-2 bg-[#8FAD77] text-white rounded-lg hover:bg-[#8FAD77]/90 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <div>
                        <h3 className="font-semibold text-white">{category.name}</h3>
                        <p className="text-sm text-slate-400">
                          Target: {category.targetPercentage}% of income
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">
                          {category.targetPercentage}%
                        </div>
                        <div className={`text-sm ${category.isActive ? 'text-[#8FAD77]' : 'text-slate-400'}`}>
                          {category.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>

                      <div className="flex space-x-1">
                        <button
                          onClick={() => startEditing(category)}
                          className="p-2 text-slate-400 hover:text-[#FFD166] transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          disabled={deleteCategoryMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-white transition-colors cursor-grab">
                          <Move className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetCategoriesPage;