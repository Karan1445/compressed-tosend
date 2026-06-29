import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRoles, createRole, editRole, deleteRole } from '../../store/slices/roleSlice';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { Pencil, Trash2, Check, X, ShieldAlert } from 'lucide-react';

const AVAILABLE_PERMISSIONS = ['send', 'sign', 'create_role', 'assign_role'];
const PROTECTED_ROLES = ['Super Admin', 'Signer'];

export default function RoleCreation() {
  const dispatch = useDispatch();
  const { roles, loading } = useSelector((state) => state.roles);

  // ── Create form state ───────────────────────────────────────────────────────
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // ── Edit state ──────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPerms, setEditPerms] = useState([]);

  useEffect(() => {
    dispatch(fetchRoles());
  }, [dispatch]);

  // Hide Super Admin from the list
  const visibleRoles = roles.filter((r) => r.name !== 'Super Admin');

  const togglePermission = (perm, setter) => {
    setter((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  // ── Create ──────────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) { toast.error('Role name is required'); return; }
    try {
      await dispatch(createRole({ name: roleName.trim(), permissions: selectedPermissions })).unwrap();
      toast.success('Role created successfully!');
      setRoleName('');
      setSelectedPermissions([]);
    } catch (err) {
      toast.error(err || 'Failed to create role');
    }
  };

  // ── Start editing ────────────────────────────────────────────────────────────
  const startEdit = (role) => {
    setEditingId(role._id);
    setEditName(role.name);
    setEditPerms([...role.permissions]);
  };

  // ── Save edit ────────────────────────────────────────────────────────────────
  const handleSaveEdit = async (roleId) => {
    if (!editName.trim()) { toast.error('Role name is required'); return; }
    try {
      await dispatch(editRole({ roleId, name: editName.trim(), permissions: editPerms })).unwrap();
      toast.success('Role updated!');
      setEditingId(null);
    } catch (err) {
      toast.error(err || 'Failed to update role');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (role) => {
    if (!window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      await dispatch(deleteRole(role._id)).unwrap();
      toast.success(`Role "${role.name}" deleted.`);
    } catch (err) {
      toast.error(err || 'Failed to delete role');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Manage Roles</h2>
        <p className="text-muted-foreground text-sm mt-1">Create, edit, or delete designations and their permissions.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ── Create Form ── */}
        <form onSubmit={handleCreate} className="space-y-6 bg-white p-6 border rounded-md shadow-sm h-fit">
          <h3 className="font-semibold text-base">Create New Role</h3>

          <div className="space-y-2">
            <Label htmlFor="roleName">Role Name</Label>
            <Input
              id="roleName"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. HR Manager"
            />
          </div>

          <div className="space-y-3">
            <Label>Permissions</Label>
            <div className="flex flex-col gap-2">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300"
                    checked={selectedPermissions.includes(perm)}
                    onChange={() => togglePermission(perm, setSelectedPermissions)}
                  />
                  <span className="font-medium text-gray-700 capitalize">{perm.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full bg-black text-white" disabled={loading}>
            {loading ? 'Creating...' : 'Create Role'}
          </Button>
        </form>

        {/* ── Existing Roles ── */}
        <div className="bg-white p-6 border rounded-md shadow-sm space-y-3">
          <h3 className="font-semibold text-base">Existing Roles</h3>

          {visibleRoles.length === 0 ? (
            <p className="text-sm text-gray-400">No roles yet.</p>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[480px]">
              {visibleRoles.map((role) => {
                const isProtected = PROTECTED_ROLES.includes(role.name);
                const isEditing = editingId === role._id;

                return (
                  <div key={role._id} className={`p-3 border rounded-md bg-gray-50 space-y-2 ${isEditing ? 'border-black' : ''}`}>
                    {isEditing ? (
                      // ── Edit view ──
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-sm font-medium"
                          placeholder="Role name"
                        />
                        <div className="flex flex-wrap gap-2 mt-1">
                          {AVAILABLE_PERMISSIONS.map((perm) => (
                            <label key={perm} className="flex items-center gap-1 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                className="w-3 h-3 rounded border-gray-300"
                                checked={editPerms.includes(perm)}
                                onChange={() => togglePermission(perm, setEditPerms)}
                              />
                              <span className="capitalize text-gray-600">{perm.replace('_', ' ')}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" className="bg-black text-white h-7 text-xs px-3" onClick={() => handleSaveEdit(role._id)} disabled={loading}>
                            <Check className="h-3 w-3 mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-3" onClick={() => setEditingId(null)}>
                            <X className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      // ── Display view ──
                      <>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{role.name}</span>
                          <div className="flex gap-1">
                            {isProtected ? (
                              <span title="System role — name is protected" className="text-gray-300">
                                <ShieldAlert className="h-3.5 w-3.5" />
                              </span>
                            ) : null}
                            <button
                              onClick={() => startEdit(role)}
                              className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition"
                              title="Edit role"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {!isProtected && (
                              <button
                                onClick={() => handleDelete(role)}
                                className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition"
                                title="Delete role"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.length === 0 ? (
                            <span className="text-xs text-gray-400">No permissions</span>
                          ) : (
                            role.permissions.map((perm) => (
                              <span key={perm} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] uppercase font-bold rounded">
                                {perm.replace('_', ' ')}
                              </span>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
