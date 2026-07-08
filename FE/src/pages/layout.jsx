import { Link, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '../components/ui/sidebar';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupLabel, SidebarGroupContent, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton,
} from '../components/ui/sidebar';
import { Users, FileQuestion, FileText, LogOutIcon, KeyRound, MoreVertical, Shield, UserPlus, Send, List, Gavel, BarChart2, GalleryVerticalEnd, Package as PackageIcon } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useState } from 'react';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import { logout, resetPassword } from '../store/slices/authSlice';



export default function Layout({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useSelector((state) => state.auth);

  const perms = user?.permissions || [];
  const isSuperAdmin = user?.role === 'Super Admin';
  const navigationItems = [
    ...(isSuperAdmin || perms.includes('assign_role') || perms.includes('create_role') ? [{ title: 'User List', url: '/', icon: Users }] : []),
    ...(isSuperAdmin || perms.includes('send') ? [{ title: 'Sender Dashboard', url: '/sender', icon: Send }] : []),
    ...(isSuperAdmin || perms.includes('send') ? [{ title: 'Question', url: '/question', icon: FileQuestion }] : []),
    ...(isSuperAdmin || perms.includes('send') ? [{ title: 'DOCX Viewer', url: '/docx-viewer', icon: FileText }] : []),
    ...(isSuperAdmin || perms.includes('sign') ? [{ title: 'Sign Document', url: '/signer', icon: FileText }] : []),
    ...(isSuperAdmin || perms.includes('send') ? [{ title: 'Submissions', url: '/submissions', icon: List }] : []),
    ...(isSuperAdmin || perms.includes('send') ? [{ title: 'Lawyer Documents', url: '/lawyer/documents', icon: Gavel }] : []),
    ...(isSuperAdmin || perms.includes('send') ? [{ title: 'Lawyer Questions', url: '/lawyer/questions', icon: FileQuestion }] : []),
    ...(isSuperAdmin || perms.includes('send') ? [{ title: 'Package Builder', url: '/lawyer/packages', icon: PackageIcon }] : []),
    ...(isSuperAdmin || perms.includes('send') ? [{ title: 'Package Store', url: '/lawyer/packages/store', icon: GalleryVerticalEnd }] : []),
    ...(isSuperAdmin || perms.includes('send') ? [{ title: 'My Submissions', url: '/lawyer/packages/past-submissions', icon: BarChart2 }] : []),
    ...(isSuperAdmin || perms.includes('create_role') ? [{ title: 'Create Role', url: '/roles/create', icon: Shield }] : []),
    ...(isSuperAdmin || perms.includes('assign_role') ? [{ title: 'Assign Role', url: '/roles/assign', icon: UserPlus }] : []),
  ];

  const [resetForm, setResetForm] = useState({ email: '', oldPassword: '', newPassword: '' });
  const [resetLoading, setResetLoading] = useState(false);

  function handleResetChange(e) {
    const { id, value } = e.target;
    const key = id === 'old-password' ? 'oldPassword' : id === 'new-password' ? 'newPassword' : id;
    setResetForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    const { email, oldPassword, newPassword } = resetForm;

    if (!email || !oldPassword || !newPassword) {
      toast.error('All fields are required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }

    try {
      setResetLoading(true);
      await dispatch(resetPassword({ email, oldPassword, newPassword })).unwrap();
      toast.success('Password updated successfully! Logging you out...');
      setTimeout(() => {
        dispatch(logout());
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err) {
      toast.error(err || 'Failed to reset password. Please try again.');
    } finally {
      setResetLoading(false);
    }
  }

  function handleLogout() {
    dispatch(logout());
    toast.success('Logged out successfully. See you soon!');
    navigate('/login', { replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
        <Sidebar variant="sidebar" collapsible="icon" className="bg-white border-r shadow-sm">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                Management
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {(isSuperAdmin || perms.includes('send')) && (
              <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Lawyer
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Questions">
                        <Link to="/lawyer/questions" className="flex items-center gap-3">
                          <BarChart2 className="h-4 w-4 shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden">Questions</span>
                        </Link>
                      </SidebarMenuButton>
                      <SidebarMenuButton asChild tooltip="Documents">
                        <Link to="/lawyer/documents" className="flex items-center gap-3">
                          <GalleryVerticalEnd className="h-4 w-4 shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden">Documents</span>
                        </Link>
                      </SidebarMenuButton>  
                      <SidebarMenuButton asChild tooltip="Packages">
                        <Link to="/lawyer/packages" className="flex items-center gap-3">
                          <PackageIcon className="h-4 w-4 shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden">Packages</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t p-3">
            <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center gap-3 w-full">
              <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                <div className="flex flex-col text-left min-w-0 group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-medium leading-none truncate capitalize">
                    {user?.name ?? 'Guest User'}
                  </span>
                  <span className="text-xs text-muted-foreground truncate mt-0.5">
                    {user?.email ?? 'No email provided'}
                  </span>
                </div>
              </div>

              <div className="group-data-[collapsible=icon]:hidden">
                <AlertDialog>
                  <Dialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-48">
                        <DialogTrigger asChild>
                          <DropdownMenuItem className="hover:bg-gray-200 cursor-pointer">
                            <KeyRound className="mr-2 h-4 w-4" />
                            <span>Reset Password</span>
                          </DropdownMenuItem>
                        </DialogTrigger>

                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-destructive focus:text-destructive hover:bg-gray-200 cursor-pointer">
                            <LogOutIcon className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
 
                    <DialogContent className="bg-white sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                          Update your account password here. Click save when done.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleResetSubmit}>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                              id="email" type="email"
                              placeholder="name@example.com"
                              value={resetForm.email}
                              onChange={handleResetChange}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="old-password">Old Password</Label>
                            <Input
                              id="old-password" type="password"
                              value={resetForm.oldPassword}
                              onChange={handleResetChange}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                              id="new-password" type="password"
                              value={resetForm.newPassword}
                              onChange={handleResetChange}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={resetLoading}>Cancel</Button>
                          </DialogClose>
                          <Button type="submit" className="bg-black text-white" disabled={resetLoading}>
                            {resetLoading ? 'Saving...' : 'Save changes'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
 
                  <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will log you out from your account on this device.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-black text-white" onClick={handleLogout}>
                        Log out
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/20 px-6 shrink-0">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-border" />
            <h1 className="text-sm font-medium text-muted-foreground">Workspace</h1>
          </header>
          <div className="p-6 md:p-8 flex-1">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
