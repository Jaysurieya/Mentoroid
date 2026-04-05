import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, LogOut, ChevronLeft, Mail, Calendar,
  Shield, Phone, MapPin, FileText, Pencil, Save, X, Check, AlertCircle,
  BookOpen, Award, Camera
} from "lucide-react";
import "./css/profile.css";

const API_BASE = "http://localhost:5000/api/auth";
const BACKEND_URL = "http://localhost:5000";

/* ── Resolve image URL (handles both absolute URLs and relative /uploads/... paths) ── */
function resolveImg(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${BACKEND_URL}${url}`;
}

/* ── Toast ── */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`profile-toast profile-toast--${type}`}>
      {type === "success" ? <Check size={16} /> : <AlertCircle size={16} />}
      {message}
    </div>
  );
}

/* ── Info Row ── */
function InfoRow({ icon, label, value, isEditing, editValue, onChange, placeholder, multiline }) {
  return (
    <div className="profile-info-row">
      <div className="profile-info-icon">{icon}</div>
      <div className="profile-info-body">
        <div className="profile-info-label">{label}</div>
        {isEditing ? (
          multiline ? (
            <textarea
              className="profile-edit-input"
              value={editValue}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              rows={3}
            />
          ) : (
            <input
              className="profile-edit-input"
              type="text"
              value={editValue}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
            />
          )
        ) : (
          <div className={`profile-info-value ${!value ? "profile-info-value--empty" : ""}`}>
            {value || "Not set"}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════ Profile Page ═══════════════ */
export function Profile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");

  const photoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const navigate = useNavigate();
  const getToken = () => localStorage.getItem("fitmate_token");

  /* ── Fetch profile ── */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = getToken();
        if (!token) throw new Error("No token found");

        const res = await fetch(`${API_BASE}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch profile");

        const data = await res.json();
        if (data.success) {
          setProfileData(data.user);
          setEditName(data.user.name || "");
          setEditPhone(data.user.phone || "");
          setEditBio(data.user.bio || "");
          setEditLocation(data.user.location || "");
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
  }, []);

  /* ── Save text fields ── */
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          bio: editBio,
          location: editLocation,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setProfileData(data.user);
        setIsEditing(false);
        setToast({ message: "Profile updated successfully!", type: "success" });
      } else {
        throw new Error(data.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      setToast({ message: err.message || "Failed to update profile", type: "error" });
    } finally {
      setSaving(false);
    }
  }, [editName, editPhone, editBio, editLocation]);

  /* ── Upload profile photo ── */
  const handlePhotoUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch(`${API_BASE}/profile/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setProfileData(prev => ({ ...prev, photoURL: data.photoURL }));
        setToast({ message: "Profile photo updated!", type: "success" });
      } else {
        throw new Error(data.message || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to upload photo", type: "error" });
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }, []);

  /* ── Upload cover photo ── */
  const handleCoverUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const token = getToken();
      const formData = new FormData();
      formData.append("cover", file);

      const res = await fetch(`${API_BASE}/profile/cover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setProfileData(prev => ({ ...prev, coverPhoto: data.coverPhoto }));
        setToast({ message: "Cover photo updated!", type: "success" });
      } else {
        throw new Error(data.message || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to upload cover", type: "error" });
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }, []);

  const handleCancel = () => {
    setEditName(profileData.name || "");
    setEditPhone(profileData.phone || "");
    setEditBio(profileData.bio || "");
    setEditLocation(profileData.location || "");
    setIsEditing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("fitmate_token");
    navigate("/signup");
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="profile-loading-spinner" />
          <div className="profile-loading-text">Loading profile...</div>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !profileData) {
    return (
      <div className="profile-page">
        <div className="profile-error-wrap">
          <motion.div
            className="profile-error-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Shield size={48} color="#ef4444" style={{ opacity: 0.8 }} />
            <h2 className="profile-error-title">Authentication Error</h2>
            <p className="profile-error-msg">Failed to load profile. Please sign in again.</p>
            <button
              className="profile-btn profile-btn--primary"
              onClick={() => { localStorage.removeItem("fitmate_token"); navigate("/signup"); }}
            >
              Return to Login
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const displayName = profileData.name || profileData.email.split("@")[0];
  const avatarLetter = displayName[0].toUpperCase();
  const memberSince = profileData.createdAt
    ? new Date(profileData.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  const daysSinceJoin = profileData.createdAt
    ? Math.floor((Date.now() - new Date(profileData.createdAt).getTime()) / 86400000)
    : 0;

  const bannerSrc = profileData.coverPhoto ? resolveImg(profileData.coverPhoto) : "/profile-banner.png";
  const avatarSrc = profileData.photoURL ? resolveImg(profileData.photoURL) : "";

  return (
    <div className="profile-page">
      {/* Hidden file inputs */}
      <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
      <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={handleCoverUpload} />

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* ── Banner ── */}
      <motion.div
        className="profile-banner"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <img src={bannerSrc} alt="Profile banner" />
        <div className="profile-banner-overlay" />
        <button
          className="profile-upload-overlay profile-upload-overlay--banner"
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          title="Change cover photo"
        >
          {uploadingCover ? <div className="profile-spinner" /> : <Camera size={18} />}
          <span>{uploadingCover ? "Uploading..." : "Change Cover"}</span>
        </button>
      </motion.div>

      {/* ── Main Card ── */}
      <motion.div
        className="profile-main"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        {/* Avatar with upload overlay */}
        <div className="profile-avatar-anchor">
          <div className="profile-avatar-outer">
            {avatarSrc ? (
              <img src={avatarSrc} alt={displayName} referrerPolicy="no-referrer" />
            ) : (
              avatarLetter
            )}
            <button
              className="profile-upload-overlay profile-upload-overlay--avatar"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              title="Change profile photo"
            >
              {uploadingPhoto ? <div className="profile-spinner profile-spinner--small" /> : <Camera size={16} />}
            </button>
          </div>
        </div>

        {/* Header row */}
        <div className="profile-header-row">
          <div className="profile-header-info">
            {isEditing ? (
              <input
                className="profile-edit-input profile-edit-name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Your name"
              />
            ) : (
              <h1 className="profile-display-name">{displayName}</h1>
            )}
            <div className="profile-display-email">{profileData.email}</div>
            <div className="profile-header-meta">
              <span className="profile-provider-pill">
                <GraduationCap size={14} />
                {profileData.provider} User
              </span>
              {profileData.location && !isEditing && (
                <span className="profile-location-tag">
                  <MapPin size={14} /> {profileData.location}
                </span>
              )}
            </div>
          </div>
          <div className="profile-header-actions">
            {isEditing ? (
              <>
                <button className="profile-btn profile-btn--secondary" onClick={handleCancel} disabled={saving}>
                  <X size={15} /> Cancel
                </button>
                <button className="profile-btn profile-btn--primary" onClick={handleSave} disabled={saving}>
                  {saving ? <div className="profile-spinner" /> : <Save size={15} />}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button className="profile-btn profile-btn--primary" onClick={() => setIsEditing(true)}>
                <Pencil size={15} /> Edit Profile
              </button>
            )}
          </div>
        </div>

        <hr className="profile-divider" />

        {/* ── Content Grid ── */}
        <div className="profile-content-grid">

          {/* Left Column — About */}
          <motion.div
            className="profile-section"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="profile-section-title">
              <FileText size={14} /> About
            </div>
            {isEditing ? (
              <textarea
                className="profile-edit-input"
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            ) : (
              <p className={`profile-bio-text ${!profileData.bio ? "profile-bio-text--empty" : ""}`}>
                {profileData.bio || "No bio yet. Click Edit Profile to add one!"}
              </p>
            )}
          </motion.div>

          {/* Right Column — Details */}
          <motion.div
            className="profile-section"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="profile-section-title">
              <BookOpen size={14} /> Details
            </div>
            <InfoRow icon={<Mail size={16} />} label="Email" value={profileData.email} isEditing={false} />
            <InfoRow icon={<Phone size={16} />} label="Phone" value={profileData.phone} isEditing={isEditing} editValue={editPhone} onChange={setEditPhone} placeholder="+91 98765 43210" />
            <InfoRow icon={<MapPin size={16} />} label="Location" value={profileData.location} isEditing={isEditing} editValue={editLocation} onChange={setEditLocation} placeholder="City, Country" />
            <InfoRow icon={<Calendar size={16} />} label="Member Since" value={memberSince} isEditing={false} />
          </motion.div>

          {/* Full-width Stats Row */}
          <motion.div
            className="profile-section profile-section--full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <div className="profile-stats-row">
              <div className="profile-stat">
                <div className="profile-stat-value">{daysSinceJoin}</div>
                <div className="profile-stat-label">Days Active</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">0</div>
                <div className="profile-stat-label">Materials</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">0</div>
                <div className="profile-stat-label">Sessions</div>
              </div>
              <div className="profile-stat">
                <div className="profile-stat-value">
                  <Award size={20} style={{ display: "inline" }} />
                </div>
                <div className="profile-stat-label">Learner</div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Bottom Nav ── */}
      <div className="profile-bottom-nav">
        <button className="profile-btn profile-btn--secondary" onClick={() => navigate("/dashboard")}>
          <ChevronLeft size={16} /> Back to Dashboard
        </button>
        <button className="profile-btn profile-btn--danger" onClick={handleLogout}>
          <LogOut size={16} /> Sign out securely
        </button>
      </div>
    </div>
  );
}

export default Profile;
