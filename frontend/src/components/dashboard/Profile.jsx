import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, LogOut, ChevronLeft, Mail, Calendar, Key, Shield } from "lucide-react";

export function Profile() {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem("fitmate_token");
                if (!token) throw new Error("No token found");

                const res = await fetch("http://localhost:5000/api/auth/profile", {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });

                if (!res.ok) throw new Error("Failed to fetch profile");

                const data = await res.json();
                if (data.success) {
                    setProfileData(data.user);
                } else {
                    throw new Error("Failed to fetch profile");
                }
            } catch (err) {
                console.error(err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0d0d0d]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1e1e1e] border-t-[#7c3aed]"></div>
                    <div className="text-[#9ca3af] font-medium tracking-wide">Loading profile...</div>
                </div>
            </div>
        );
    }

    if (error || !profileData) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0d0d0d] p-4">
                <div className="w-full max-w-md rounded-2xl bg-[#111111] p-8 border border-[#1e1e1e] text-center">
                    <Shield className="mx-auto mb-4 h-12 w-12 text-[#ef4444] opacity-80" />
                    <h2 className="text-xl font-semibold text-[#e5e7eb] mb-2">Authentication Error</h2>
                    <p className="text-[#9ca3af] mb-6">Failed to load profile. Please sign in again.</p>
                    <button
                        onClick={() => {
                            localStorage.removeItem("fitmate_token");
                            navigate("/signup");
                        }}
                        className="w-full bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors py-2.5 rounded-lg font-medium"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    const handleLogout = () => {
        localStorage.removeItem("fitmate_token");
        navigate("/signup");
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d] p-4 font-sans text-[#e8e8e8]">
            <div className="w-full max-w-md rounded-2xl bg-[#111111] p-8 shadow-2xl border border-[#1e1e1e] relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#7c3aed] rounded-full blur-[80px] opacity-10 pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="mb-8 flex flex-col items-center">
                        <div className="relative">
                            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#5b21b6] text-white font-bold text-4xl mb-4 shadow-[0_0_20px_rgba(124,58,237,0.3)] ring-4 ring-[#1a1a1a]">
                                {profileData.email[0].toUpperCase()}
                            </div>
                            <div className="absolute bottom-4 right-0 bg-[#22c55e] h-5 w-5 rounded-full border-[3px] border-[#111111]"></div>
                        </div>
                        <h2 className="text-2xl font-bold text-[#e5e7eb] line-clamp-1 mb-1">{profileData.email}</h2>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a1a1a] border border-[#252525] mt-2">
                            <GraduationCap size={14} className="text-[#a78bfa]" />
                            <p className="text-xs font-medium text-[#c4b5fd] capitalize">{profileData.provider} User</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-8 bg-[#0a0a0a] rounded-xl p-5 border border-[#1a1a1a]">
                        <div className="flex items-center gap-3 border-b border-[#1e1e1e] pb-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111111] text-[#6b7280]">
                                <Mail size={16} />
                            </div>
                            <div className="flex-1">
                                <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-0.5">Email Address</div>
                                <div className="text-[13px] font-medium text-[#d1d5db]">{profileData.email}</div>
                            </div>
                        </div>

                        {profileData.firebaseUid && (
                            <div className="flex items-center gap-3 border-b border-[#1e1e1e] pb-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111111] text-[#6b7280]">
                                    <Key size={16} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-0.5">Firebase ID</div>
                                    <div className="text-[13px] font-medium text-[#d1d5db] truncate" title={profileData.firebaseUid}>{profileData.firebaseUid}</div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#111111] text-[#6b7280]">
                                <Calendar size={16} />
                            </div>
                            <div className="flex-1">
                                <div className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-0.5">Member Since</div>
                                <div className="text-[13px] font-medium text-[#d1d5db]">
                                    {new Date(profileData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="flex items-center justify-center gap-2 w-full bg-[#7c3aed] text-white hover:bg-[#6d28d9] hover:shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all py-3 rounded-xl font-medium text-[14px]"
                        >
                            <ChevronLeft size={18} />
                            Back to Dashboard
                        </button>

                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-2 w-full bg-transparent border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors py-3 rounded-xl font-medium text-[14px]"
                        >
                            <LogOut size={16} />
                            Sign out securely
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
