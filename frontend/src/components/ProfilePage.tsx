'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from './ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from './ui/alert-dialog';
import { ArrowLeft, Save, Trash2, Loader2 } from 'lucide-react';

export default function ProfilePage() {
    const router = useRouter();
    const { logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        username: '',
        avatar: '',
        ageRange: '',
        guardianEmail: '',
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Not authenticated');

                const res = await fetch('http://localhost:5000/users/profile', {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) throw new Error('Failed to fetch profile');

                const data = await res.json();
                setFormData({
                    username: data.username || '',
                    avatar: data.avatar || '🐱',
                    ageRange: data.ageRange || '',
                    guardianEmail: data.guardianEmail || '',
                });
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Not authenticated');

            const res = await fetch('http://localhost:5000/users/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    avatar: formData.avatar,
                    ageRange: formData.ageRange,
                    guardianEmail: formData.guardianEmail,
                }),
            });

            if (!res.ok) throw new Error('Failed to update profile');

            setSuccess('Profile updated successfully!');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('Not authenticated');

            const res = await fetch('http://localhost:5000/users/profile', {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error('Failed to delete account');

            await logout();
            router.push('/');
        } catch (err: any) {
            setError(err.message);
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4 sm:p-8">
            <div className="max-w-2xl mx-auto">
                <Button
                    variant="ghost"
                    className="mb-6 hover:bg-white/50"
                    onClick={() => router.push('/dashboard')}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>

                <Card className="border-2 border-indigo-100 shadow-xl bg-white/90 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-indigo-900">
                            Profile Settings
                        </CardTitle>
                        <CardDescription>
                            Update your personal information or manage your account.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={formData.username}
                                    disabled
                                    className="bg-gray-50"
                                />
                                <p className="text-xs text-gray-500">
                                    Username cannot be changed.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="avatar">Avatar Emoji</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="avatar"
                                        value={formData.avatar}
                                        onChange={(e) =>
                                            setFormData({ ...formData, avatar: e.target.value })
                                        }
                                        className="text-2xl w-16 text-center"
                                        maxLength={2}
                                    />
                                    <div className="flex-1 flex items-center text-sm text-gray-500">
                                        Pick an emoji to represent you! 🐱 🚀 🌟
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="ageRange">Age Range</Label>
                                <Select
                                    value={formData.ageRange}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, ageRange: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select age range" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="8-10">8-10 years</SelectItem>
                                        <SelectItem value="11-13">11-13 years</SelectItem>
                                        <SelectItem value="14+">14+ years</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="guardianEmail">Guardian Email</Label>
                                <Input
                                    id="guardianEmail"
                                    type="email"
                                    value={formData.guardianEmail}
                                    onChange={(e) =>
                                        setFormData({ ...formData, guardianEmail: e.target.value })
                                    }
                                    placeholder="parent@example.com"
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="p-3 rounded-lg bg-green-50 text-green-600 text-sm border border-green-100">
                                    {success}
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Save className="w-4 h-4 mr-2" />
                                    )}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>

                    <CardFooter className="bg-red-50/50 border-t border-red-100 p-6 mt-6 flex flex-col items-start gap-4">
                        <div>
                            <h3 className="text-red-900 font-semibold mb-1">Danger Zone</h3>
                            <p className="text-sm text-red-700">
                                Deleting your account is irreversible. All your progress, badges,
                                and missions will be lost forever.
                            </p>
                        </div>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" className="w-full sm:w-auto">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Account
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete your
                                        account and remove your data from our servers.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDelete}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        {deleting ? 'Deleting...' : 'Yes, delete my account'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
