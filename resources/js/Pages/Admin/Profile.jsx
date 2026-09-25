import {
    Building2,
    Camera,
    Check,
    ImagePlus,
    LockKeyhole,
    Mail,
    ShieldCheck,
    Trash2,
    UserRound,
    X,
} from "lucide-react";
import { useForm } from "@inertiajs/react";
import { useRef, useState } from "react";

export default function Profile({ user, email, filipino }) {
    const displayName = user?.name || "Pasig CENRO Administrator";
    const form = useForm({ photo: null });
    const [preview, setPreview] = useState(null);
    const [clientError, setClientError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        setClientError(null);
        form.clearErrors("photo");

        if (!file) {
            setPreview(null);
            form.setData("photo", null);
            return;
        }

        // 10 MB limit check (10 * 1024 * 1024 bytes)
        const maxBytes = 10 * 1024 * 1024;
        if (file.size > maxBytes) {
            setClientError(
                "Photo exceeds the 10 MB limit. Please choose a smaller image.",
            );
            if (fileInputRef.current) fileInputRef.current.value = "";
            setPreview(null);
            form.setData("photo", null);
            return;
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            setClientError("Please select a JPG, PNG, or WebP image.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            setPreview(null);
            form.setData("photo", null);
            return;
        }

        form.setData("photo", file);
        setPreview(URL.createObjectURL(file));
    };

    const cancelPreview = () => {
        form.reset();
        setPreview(null);
        setClientError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const savePhoto = (e) => {
        e.preventDefault();
        if (!form.data.photo) return;

        form.post("/admin/profile/photo", {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                cancelPreview();
            },
        });
    };

    const handleRemove = () => {
        if (!confirm("Are you sure you want to remove your profile photo?"))
            return;

        form.delete("/admin/profile/photo", {
            preserveScroll: true,
            onSuccess: () => {
                cancelPreview();
            },
        });
    };

    return (
        <>
            <h1 className="admin-page-title">
                {filipino
                    ? filipino
                        ? "Profile"
                        : "Profile"
                    : filipino
                      ? "Profile"
                      : "Profile"}
            </h1>
            <section className="admin-panel admin-profile-form">
                <header className="admin-profile-heading">
                    <span className="admin-profile-photo" aria-hidden="true">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="" />
                        ) : (
                            <UserRound />
                        )}
                    </span>
                    <div>
                        <h2>{displayName}</h2>
                        <p>
                            City Environment and Natural Resources Office ·
                            Pasig City
                        </p>
                    </div>
                </header>

                <section
                    className="admin-settings-section"
                    aria-labelledby="admin-photo-heading"
                >
                    <div>
                        <h2 id="admin-photo-heading">Profile photo</h2>
                        <p>
                            Add an official CENRO account photo to personalize
                            your administrative workspace.
                        </p>
                    </div>
                    <div className="admin-settings-content">
                        <form
                            onSubmit={savePhoto}
                            className="admin-photo-preview"
                            noValidate
                        >
                            <span
                                className="admin-large-avatar"
                                aria-hidden="true"
                            >
                                {preview ? (
                                    <img
                                        src={preview}
                                        alt="Profile photo preview"
                                    />
                                ) : user?.avatar_url ? (
                                    <img
                                        src={user.avatar_url}
                                        alt="Profile photo"
                                    />
                                ) : (
                                    <Camera aria-hidden="true" />
                                )}
                            </span>
                            <div className="admin-photo-details">
                                <strong>Pasig CENRO account</strong>
                                <p>JPG, PNG, or WebP files up to 10 MB.</p>
                                <input
                                    ref={fileInputRef}
                                    id="admin-profile-photo-input"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    className="sr-only"
                                    onChange={handleFileChange}
                                />
                                <div className="admin-photo-actions">
                                    <button
                                        type="button"
                                        className="admin-secondary-button admin-photo-btn"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        disabled={form.processing}
                                    >
                                        <ImagePlus aria-hidden="true" />
                                        <span>
                                            {preview || user?.avatar_url
                                                ? filipino
                                                    ? "Palitan ang litrato"
                                                    : "Change photo"
                                                : "Choose photo"}
                                        </span>
                                    </button>
                                    {preview && (
                                        <>
                                            <button
                                                type="submit"
                                                className="admin-primary-button admin-photo-btn"
                                                disabled={form.processing}
                                            >
                                                <Check aria-hidden="true" />
                                                <span>
                                                    {form.processing
                                                        ? "Saving…"
                                                        : "Save photo"}
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-secondary-button admin-photo-btn"
                                                onClick={cancelPreview}
                                                disabled={form.processing}
                                            >
                                                <X aria-hidden="true" />
                                                <span>Cancel</span>
                                            </button>
                                        </>
                                    )}
                                    {!preview && user?.avatar_url && (
                                        <button
                                            type="button"
                                            className="admin-danger-button admin-photo-btn"
                                            onClick={handleRemove}
                                            disabled={form.processing}
                                        >
                                            <Trash2 aria-hidden="true" />
                                            <span>
                                                {filipino
                                                    ? "Alisin ang litrato"
                                                    : filipino
                                                      ? "Alisin ang litrato"
                                                      : "Remove photo"}
                                            </span>
                                        </button>
                                    )}
                                </div>
                                {clientError && (
                                    <p
                                        className="admin-photo-error"
                                        role="alert"
                                    >
                                        {clientError}
                                    </p>
                                )}
                                {form.errors.photo && (
                                    <p
                                        className="admin-photo-error"
                                        role="alert"
                                    >
                                        {form.errors.photo}
                                    </p>
                                )}
                            </div>
                        </form>
                    </div>
                </section>

                <section
                    className="admin-settings-section"
                    aria-labelledby="admin-details-heading"
                >
                    <div>
                        <h2 id="admin-details-heading">Account details</h2>
                        <p>
                            Review the identity used for this CENRO
                            administrator workspace.
                        </p>
                    </div>
                    <dl className="admin-profile-details">
                        <ProfileDetail
                            icon={UserRound}
                            label="Display name"
                            value={displayName}
                        />
                        <ProfileDetail
                            icon={Mail}
                            label={filipino ? "Email address" : "Email address"}
                            value={email}
                            disabled
                        />
                        <ProfileDetail
                            icon={ShieldCheck}
                            label="Account role"
                            value="CENRO Administrator"
                        />
                        <ProfileDetail
                            icon={Building2}
                            label="Office"
                            value="Pasig City CENRO"
                        />
                    </dl>
                </section>

                <section
                    className="admin-settings-section"
                    aria-labelledby="admin-security-heading"
                >
                    <div>
                        <h2 id="admin-security-heading">Password & security</h2>
                        <p>
                            Password tools will be added when administrator
                            account management is connected.
                        </p>
                    </div>
                    <div className="admin-security-note">
                        <span aria-hidden="true">
                            <LockKeyhole />
                        </span>
                        <div>
                            <strong>Account access is protected</strong>
                            <p>
                                Your administrator role and access restrictions
                                are enforced by the server.
                            </p>
                        </div>
                    </div>
                </section>
            </section>
        </>
    );
}

function ProfileDetail({ icon: Icon, label, value }) {
    return (
        <div>
            <dt>
                <Icon aria-hidden="true" />
                {label}
            </dt>
            <dd>{value}</dd>
        </div>
    );
}
