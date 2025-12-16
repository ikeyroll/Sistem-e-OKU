"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { UserPlus, Edit, Trash2, UserCheck, UserX, Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getAllAdmins, createAdmin, updateAdmin, deleteAdmin, toggleAdminStatus, initializeDefaultAdmins, type AdminUser } from '@/lib/api/auth';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ManageAdmins() {
  const router = useRouter();
  const { language } = useLanguage();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'admin' as 'admin' | 'admin_boss',
    is_active: true,
  });

  // Check authentication and role
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    const role = localStorage.getItem('adminRole');
    
    if (!isLoggedIn) {
      router.push('/admin/login');
      return;
    }
    
    if (role !== 'admin_boss') {
      toast.error(language === 'en' ? 'Access denied. Only Admin Boss can manage admins.' : 'Akses ditolak. Hanya Admin Boss boleh mengurus admin.');
      router.push('/admin');
      return;
    }
    
    // Initialize default admins if needed
    initializeDefaultAdmins().then(() => {
      loadAdmins();
    });
  }, [router, language]);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const data = await getAllAdmins();
      setAdmins(data);
    } catch (error) {
      console.error('Error loading admins:', error);
      toast.error(language === 'en' ? 'Failed to load admin list' : 'Gagal memuat senarai admin');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.full_name) {
      toast.error(language === 'en' ? 'Please fill in all required fields' : 'Sila isi semua medan wajib');
      return;
    }

    if (!editingAdmin && !formData.password) {
      toast.error(language === 'en' ? 'Password required for new admin' : 'Password diperlukan untuk admin baru');
      return;
    }

    try {
      if (editingAdmin) {
        // Update existing admin
        const updates: any = {
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          is_active: formData.is_active,
        };
        
        if (formData.password) {
          updates.password = formData.password;
        }
        
        const result = await updateAdmin(editingAdmin.id, updates);
        
        if (result.success) {
          toast.success(language === 'en' ? 'Admin updated successfully' : 'Admin berjaya dikemaskini');
          setIsDialogOpen(false);
          resetForm();
          loadAdmins();
        } else {
          toast.error(result.error || (language === 'en' ? 'Failed to update admin' : 'Gagal mengemaskini admin'));
        }
      } else {
        // Create new admin
        const result = await createAdmin(formData);
        
        if (result.success) {
          toast.success(language === 'en' ? 'New admin added successfully' : 'Admin baru berjaya ditambah');
          setIsDialogOpen(false);
          resetForm();
          loadAdmins();
        } else {
          toast.error(result.error || (language === 'en' ? 'Failed to add admin' : 'Gagal menambah admin'));
        }
      }
    } catch (error) {
      console.error('Error saving admin:', error);
      toast.error(language === 'en' ? 'Error saving admin' : 'Ralat semasa menyimpan admin');
    }
  };

  const handleEdit = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setFormData({
      username: admin.username,
      password: '',
      full_name: admin.full_name,
      email: admin.email || '',
      role: admin.role,
      is_active: admin.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (admin: AdminUser) => {
    setAdminToDelete(admin);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!adminToDelete) return;

    try {
      const result = await deleteAdmin(adminToDelete.id);
      
      if (result.success) {
        toast.success(language === 'en' ? 'Admin deleted successfully' : 'Admin berjaya dipadam');
        loadAdmins();
      } else {
        toast.error(result.error || (language === 'en' ? 'Failed to delete admin' : 'Gagal memadam admin'));
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error(language === 'en' ? 'Error deleting admin' : 'Ralat semasa memadam admin');
    } finally {
      setDeleteDialogOpen(false);
      setAdminToDelete(null);
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    try {
      const result = await toggleAdminStatus(admin.id, !admin.is_active);
      
      if (result.success) {
        const msg = language === 'en'
          ? `Admin ${!admin.is_active ? 'activated' : 'deactivated'}`
          : `Admin ${!admin.is_active ? 'diaktifkan' : 'dinyahaktifkan'}`;
        toast.success(msg);
        loadAdmins();
      } else {
        toast.error(result.error || (language === 'en' ? 'Failed to change admin status' : 'Gagal mengubah status admin'));
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
      toast.error(language === 'en' ? 'Error changing status' : 'Ralat semasa mengubah status');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      full_name: '',
      email: '',
      role: 'admin',
      is_active: true,
    });
    setEditingAdmin(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen py-12 bg-gradient-to-br from-primary/5 to-background">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">{language === 'en' ? 'Loading data...' : 'Memuat data...'}</p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen py-12 bg-gradient-to-br from-primary/5 to-background">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Back Button & Header */}
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/admin')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {language === 'en' ? 'Back to Admin Panel' : 'Kembali ke Panel Admin'}
            </Button>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
                  <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
                  {language === 'en' ? 'Admin Management' : 'Pengurusan Admin'}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {language === 'en' ? 'Manage system admin accounts' : 'Urus akaun admin sistem'}
                </p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="w-full sm:w-auto">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {language === 'en' ? 'Add Admin' : 'Tambah Admin'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAdmin 
                        ? (language === 'en' ? 'Update Admin' : 'Kemaskini Admin')
                        : (language === 'en' ? 'Add New Admin' : 'Tambah Admin Baru')}
                    </DialogTitle>
                    <DialogDescription>
                      {editingAdmin 
                        ? (language === 'en' ? 'Update admin information' : 'Kemaskini maklumat admin')
                        : (language === 'en' ? 'Fill in information for new admin' : 'Isi maklumat untuk admin baru')}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="username">Username *</Label>
                        <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          disabled={!!editingAdmin}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">
                          Password {editingAdmin 
                            ? (language === 'en' ? '(Leave blank to keep current)' : '(Kosongkan jika tidak ubah)')
                            : '*'}
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required={!editingAdmin}
                        />
                      </div>
                      <div>
                        <Label htmlFor="full_name">{language === 'en' ? 'Full Name' : 'Nama Penuh'} *</Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="role">{language === 'en' ? 'Role' : 'Peranan'} *</Label>
                        <Select value={formData.role} onValueChange={(value: 'admin' | 'admin_boss') => setFormData({ ...formData, role: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="admin_boss">Admin Boss</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Aktif checkbox dibuang mengikut arahan - status akan default true untuk admin baru */}
                    </div>
                    <DialogFooter className="mt-6">
                      <Button type="button" variant="outline" onClick={handleDialogClose}>
                        {language === 'en' ? 'Cancel' : 'Batal'}
                      </Button>
                      <Button type="submit">
                        {editingAdmin 
                          ? (language === 'en' ? 'Update' : 'Kemaskini')
                          : (language === 'en' ? 'Add' : 'Tambah')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{language === 'en' ? 'Admin List' : 'Senarai Admin'}</CardTitle>
              <CardDescription>
                {language === 'en' ? `Total: ${admins.length} admins` : `Jumlah: ${admins.length} admin`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mobile View - Cards */}
              <div className="block md:hidden space-y-4">
                {admins.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      {language === 'en' ? 'No admins found' : 'Tiada admin dijumpai'}
                    </p>
                  </div>
                ) : (
                  admins.map((admin) => (
                    <Card key={admin.id} className="overflow-hidden border-l-4 border-l-primary/30 hover:border-l-primary transition-colors">
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-lg truncate">{admin.full_name}</p>
                            <p className="text-sm text-muted-foreground truncate">@{admin.username}</p>
                          </div>
                          <Badge variant={admin.role === 'admin_boss' ? 'default' : 'secondary'} className="shrink-0">
                            {admin.role === 'admin_boss' ? 'Boss' : 'Admin'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground min-w-[60px]">Email:</span>
                            <span className="truncate">{admin.email || '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground min-w-[60px]">
                              {language === 'en' ? 'Created:' : 'Dibuat:'}
                            </span>
                            <span>{new Date(admin.created_at).toLocaleDateString(language === 'en' ? 'en-GB' : 'ms-MY')}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(admin)}
                            className="flex-1 h-10"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {language === 'en' ? 'Edit' : 'Edit'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(admin)}
                            className="flex-1 h-10"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {language === 'en' ? 'Delete' : 'Padam'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden md:block overflow-x-auto">
                {admins.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      {language === 'en' ? 'No admins found' : 'Tiada admin dijumpai'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>{language === 'en' ? 'Full Name' : 'Nama Penuh'}</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>{language === 'en' ? 'Role' : 'Peranan'}</TableHead>
                        <TableHead>{language === 'en' ? 'Created Date' : 'Tarikh Dibuat'}</TableHead>
                        <TableHead className="text-right">{language === 'en' ? 'Actions' : 'Tindakan'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map((admin) => (
                        <TableRow key={admin.id} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium font-mono text-sm">{admin.username}</TableCell>
                          <TableCell className="font-medium">{admin.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">{admin.email || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={admin.role === 'admin_boss' ? 'default' : 'secondary'}>
                              {admin.role === 'admin_boss' ? 'Admin Boss' : 'Admin'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(admin.created_at).toLocaleDateString(language === 'en' ? 'en-GB' : 'ms-MY')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(admin)}
                                title={language === 'en' ? 'Edit' : 'Edit'}
                                className="hover:bg-primary hover:text-primary-foreground transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(admin)}
                                title={language === 'en' ? 'Delete' : 'Padam'}
                                className="hover:bg-destructive/90 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'en' ? 'Delete Admin' : 'Padam Admin'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'en' 
                ? `Are you sure you want to delete admin "${adminToDelete?.full_name}"? This action cannot be undone.`
                : `Adakah anda pasti untuk memadam admin "${adminToDelete?.full_name}"? Tindakan ini tidak boleh dibatalkan.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAdminToDelete(null)}>
              {language === 'en' ? 'Cancel' : 'Batal'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {language === 'en' ? 'Delete' : 'Padam'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
