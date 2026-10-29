import React, { useState, useEffect } from 'react';
import { User, Mail, Code2, Phone, CheckCircle2, AlertCircle, Shield, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { profileService, type UpdateProfileInput } from '../../services/profileService';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { BrandLogo } from '../../components/common/BrandLogo';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.profile?.full_name || user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.profile?.avatar_url || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [githubHandle, setGithubHandle] = useState(user?.profile?.github_handle || '');
  const [phone, setPhone] = useState(user?.profile?.phone || '');

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.profile) {
      setFullName(user.profile.full_name || user.name || '');
      setAvatarUrl(user.profile.avatar_url || '');
      setBio(user.profile.bio || '');
      setGithubHandle(user.profile.github_handle || '');
      setPhone(user.profile.phone || '');
    }
  }, [user]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const input: UpdateProfileInput = {
      full_name: fullName,
      avatar_url: avatarUrl || null,
      bio: bio || null,
      github_handle: githubHandle || null,
      phone: phone || null,
    };

    try {
      await profileService.updateProfile(user.id, input);
      await refreshUser();
      setSuccessMessage('Profile details updated successfully');
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#171717]">My Profile</h1>
        <p className="text-xs md:text-sm text-[#737373] mt-0.5">
          Manage your personal information, contact methods, and club preferences
        </p>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] flex items-center gap-2.5 text-xs text-[#047857]" role="alert">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#047857]" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2.5 text-xs text-[#B91C1C]" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card / Overview */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="flex flex-col items-center text-center p-6">
              <div className="relative mb-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#E5E5E5]"
                    onError={() => setAvatarUrl('')}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#171717] border-2 border-[#262626] text-white flex items-center justify-center font-bold text-2xl">
                    {fullName ? fullName.slice(0, 2).toUpperCase() : user.email.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-[#090909] text-white p-1 rounded-full shadow">
                  <Shield className="w-3.5 h-3.5" />
                </div>
              </div>

              <h2 className="text-base font-bold text-[#171717]">{fullName || 'Club Member'}</h2>
              <p className="text-xs text-[#737373] font-mono mt-0.5">{user.email}</p>

              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {user.roles.map((r) => (
                  <Badge key={r} role={r} size="sm" />
                ))}
              </div>

              {bio && (
                <p className="text-xs text-[#737373] mt-4 pt-4 border-t border-[#E5E5E5] italic">
                  "{bio}"
                </p>
              )}

              <div className="w-full mt-6 pt-4 border-t border-[#E5E5E5] text-left space-y-2 text-xs text-[#737373]">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#737373]" />
                  <span className="truncate">{user.email}</span>
                </div>
                {githubHandle && (
                  <div className="flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-[#737373]" />
                    <a
                      href={`https://github.com/${githubHandle}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#171717] hover:underline truncate font-medium"
                    >
                      github.com/{githubHandle}
                    </a>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />
                    <span>{phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                  <span>Member since {new Date(user.profile?.created_at || Date.now()).toLocaleDateString()}</span>
                </div>

                <div className="pt-3 mt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#64748B]">Club Organization</span>
                  <div className="flex items-center gap-1.5">
                    <BrandLogo size="xs" />
                    <span className="font-semibold text-xs text-[#0F172A]">DevCatalyst Club</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Edit Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile Information</CardTitle>
              <CardDescription>
                Update your public profile and authorized contact information
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleUpdate}>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    leftIcon={<User className="w-4 h-4" />}
                  />

                  <Input
                    label="Email Address (Read-only)"
                    value={user.email}
                    disabled
                    leftIcon={<Mail className="w-4 h-4" />}
                    helperText="Email is bound to your authentication identity."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="GitHub Username"
                    value={githubHandle}
                    onChange={(e) => setGithubHandle(e.target.value)}
                    placeholder="e.g. torvalds"
                    leftIcon={<Code2 className="w-4 h-4" />}
                    helperText="Displayed on project task assignments."
                  />

                  <Input
                    label="Contact Phone (Optional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    leftIcon={<Phone className="w-4 h-4" />}
                    helperText="Visible only to authorized club organizers."
                  />
                </div>

                <Input
                  label="Avatar URL (Optional)"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  helperText="Direct image URL for your profile picture."
                />

                <div className="space-y-1.5 text-left">
                  <label htmlFor="bio-input" className="block text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    Bio / About Me
                  </label>
                  <textarea
                    id="bio-input"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell other club members about your technical background and interests..."
                    className="w-full bg-white border border-[#E5E5E5] hover:border-[#CCCCCC] focus:border-[#090909] focus:ring-2 focus:ring-[#090909]/20 text-sm rounded-lg px-3 py-2 text-[#171717] placeholder-[#737373] transition-all outline-none"
                  />
                </div>
              </CardContent>

              <CardFooter className="justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                >
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
