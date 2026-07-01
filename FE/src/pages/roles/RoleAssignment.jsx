import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers } from '../../store/slices/usersSlice';
import { fetchRoles, assignRole } from '../../store/slices/roleSlice';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RoleAssignment() {
  const dispatch = useDispatch();
  const { users, loading: usersLoading } = useSelector((state) => state.users);
  const { roles, loading: rolesLoading } = useSelector((state) => state.roles);
  const { user: currentUser } = useSelector((state) => state.auth);

  const [assigningUserId, setAssigningUserId] = useState(null);

  const assignableRoles = roles.filter((r) => r.name !== 'Super Admin');

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchRoles());
  }, [dispatch]);

  const handleAssignRole = async (userId, roleId) => {
    if (!roleId) return;
    try {
      setAssigningUserId(userId);
      await dispatch(assignRole({ userId, roleId })).unwrap();
      toast.success('Role assigned successfully! An email has been sent to the user.');
      dispatch(fetchUsers());
    } catch (err) {
      toast.error(err || 'Failed to assign role');
    } finally {
      setAssigningUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Assign Roles</h2>
        <p className="text-muted-foreground">Manage user designations and update permissions.</p>
      </div>

      <div className="bg-white border rounded-md shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-900">Name</th>
              <th className="px-6 py-4 font-medium text-gray-900">Email</th>
              <th className="px-6 py-4 font-medium text-gray-900">Current Role</th>
              <th className="px-6 py-4 font-medium text-gray-900 text-right">Assign New Role</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {usersLoading && users.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">Loading users...</td>
              </tr>
            ) : users.map(user => (
              <tr key={user._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 text-gray-500">{user.email}</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-full border border-slate-200">
                    {user.role?.name || 'No Role'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {user.role?.name === 'Super Admin' ? (
                    <span className="text-xs text-gray-400 italic">Cannot be modified</span>
                  ) : currentUser && String(user._id) === String(currentUser._id) ? (
                    <span className="text-xs text-gray-400 italic">Cannot change own role</span>
                  ) : (
                    <div className="relative inline-flex flex-col items-end w-40 ml-auto">
                      {assigningUserId === user._id ? (
                        <div className="flex h-9 w-full items-center justify-start rounded-md border border-input bg-muted/50 px-3 py-2 text-sm opacity-70 shadow-sm">
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin text-gray-500" />
                          <span className="text-gray-500">Updating...</span>
                        </div>
                      ) : (
                        <Select
                          value=""
                          onValueChange={(value) => handleAssignRole(user._id, value)}
                          disabled={rolesLoading}
                        >
                          <SelectTrigger className="w-full h-9 bg-white">
                            <SelectValue placeholder="Change role..." />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {assignableRoles.map(role => (
                              <SelectItem key={role._id} value={role._id} className="cursor-pointer">
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!usersLoading && users.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
