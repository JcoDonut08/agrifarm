import { useForm } from "@inertiajs/react";
import Pagination from '../Seller/Pagination';
import {
    ArrowLeft,
    ShieldCheck,
    UserPlus,
    FilePenLine,
    BadgeCheck,
    Camera,
    Eye,
    History,
    ImagePlus,
    MapPin,
    Pencil,
    Plus,
    Search,
    ShieldAlert,
    Store,
    Trash2,
    UserRound,
    UsersRound,
    X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const blankSeller = {
    name: "",
    email: "",
    barangay: "",
    temporary_password: "",
    temporary_password_confirmation: "",
    photo: null,
};

const SUSPENSION_REASONS = [
    "Policy or storefront guidelines violation",
    "Inaccurate product listings or inventory counts",
    "Repeated unfulfilled or delayed customer orders",
    "Unresponsive to CENRO verification inquiries",
    "Requested by seller (temporary farm closure)",
    "Suspected fraudulent or unauthorized activity",
    "Other administrative reason",
];

export default function FarmersSellers({ management = {}, filipino }) {
    const sellers = management.sellers || [];
    const barangays = management.barangays || [];
    const [search, setSearch] = useState("");
    const [barangay, setBarangay] = useState("");
    const [status, setStatus] = useState("");
    const [mode, setMode] = useState(null);
    const [selected, setSelected] = useState(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    const stats = useMemo(() => {
        const total = sellers.length;
        const active = sellers.filter((s) => s.status === "active").length;
        const suspended = sellers.filter(
            (s) => s.status === "suspended",
        ).length;
        return { total, active, suspended };
    }, [sellers]);

    const filtered = useMemo(() => {
        return sellers.filter((seller) => {
            const matchesSearch =
                `${seller.name} ${seller.email} ${seller.barangay || ""}`
                    .toLowerCase()
                    .includes(search.trim().toLowerCase());
            return (
                matchesSearch &&
                (!barangay || seller.barangay === barangay) &&
                (!status || seller.status === status)
            );
        });
    }, [sellers, search, barangay, status]);

    useEffect(() => {
        setPage(1);
    }, [search, barangay, status]);

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);
    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page, pageSize]);

    const hasFilters = Boolean(search || barangay || status);
    const resetFilters = () => {
        setSearch("");
        setBarangay("");
        setStatus("");
    };

    const open = (nextMode, seller = null) => {
        setSelected(seller);
        setMode(nextMode);
    };

    const close = () => {
        setMode(null);
        setSelected(null);
    };

    return (
        <>
            <section
                className="admin-sellers-page"
                aria-label={
                    filipino
                        ? "Direktoryo ng mga Magsasaka at Nagbebenta"
                        : "Farmers and Sellers Directory"
                }
            >
                <h1 id="farmers-sellers-title" className="sr-only">
                    Farmers &amp; Sellers
                </h1>

                {/* Metric Cards Grid */}
                <div
                    className="admin-seller-metric-grid"
                    aria-label={
                        filipino
                            ? "Pangkalahatang estadistika ng nagbebenta"
                            : "Sellers overview statistics"
                    }
                >
                    <div className="admin-seller-metric-card">
                        <div className="admin-seller-metric-icon admin-seller-metric-icon--total">
                            <UsersRound aria-hidden="true" />
                        </div>
                        <div className="admin-seller-metric-info">
                            <span className="admin-seller-metric-label">
                                Total Sellers
                            </span>
                            <strong className="admin-seller-metric-val">
                                {stats.total}
                            </strong>
                            <span className="admin-seller-metric-sub">
                                Registered accounts
                            </span>
                        </div>
                    </div>

                    <div className="admin-seller-metric-card admin-seller-metric-card--active">
                        <div className="admin-seller-metric-icon admin-seller-metric-icon--active">
                            <BadgeCheck aria-hidden="true" />
                        </div>
                        <div className="admin-seller-metric-info">
                            <span className="admin-seller-metric-label">
                                Active Sellers
                            </span>
                            <strong className="admin-seller-metric-val">
                                {stats.active}
                            </strong>
                            <span className="admin-seller-metric-sub">
                                Live on marketplace
                            </span>
                        </div>
                    </div>

                    <div className="admin-seller-metric-card admin-seller-metric-card--suspended">
                        <div className="admin-seller-metric-icon admin-seller-metric-icon--suspended">
                            <ShieldAlert aria-hidden="true" />
                        </div>
                        <div className="admin-seller-metric-info">
                            <span className="admin-seller-metric-label">
                                Suspended
                            </span>
                            <strong className="admin-seller-metric-val">
                                {stats.suspended}
                            </strong>
                            <span className="admin-seller-metric-sub">
                                Accounts restricted
                            </span>
                        </div>
                    </div>
                </div>

                {/* Directory Panel */}
                <section className="admin-panel admin-seller-directory">
                    <div className="admin-directory-toolbar">
                        <div className="admin-directory-toolbar-left">
                            <div className="admin-search-field">
                                <Search aria-hidden="true" />
                                <label
                                    htmlFor="admin-seller-search"
                                    className="sr-only"
                                >
                                    Search farmers and sellers
                                </label>
                                <input
                                    id="admin-seller-search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search name, email, or barangay..."
                                />
                                {search && (
                                    <button
                                        type="button"
                                        className="admin-search-clear"
                                        onClick={() => setSearch("")}
                                        aria-label="Clear search input"
                                    >
                                        <X aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                            <div className="admin-filter-controls">
                                <label className="admin-filter-select-wrap">
                                    <span className="sr-only">
                                        Filter by barangay
                                    </span>
                                    <select
                                        value={barangay}
                                        onChange={(event) =>
                                            setBarangay(event.target.value)
                                        }
                                        aria-label={
                                            filipino
                                                ? "I-filter ayon sa barangay"
                                                : "Filter by barangay"
                                        }
                                    >
                                        <option value="">
                                            {filipino
                                                ? "Lahat ng barangay"
                                                : filipino
                                                  ? "Lahat ng barangay"
                                                  : "All barangays"}
                                        </option>
                                        {barangays.map((item) => (
                                            <option key={item} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="admin-filter-select-wrap">
                                    <span className="sr-only">
                                        Filter by account status
                                    </span>
                                    <select
                                        value={status}
                                        onChange={(event) =>
                                            setStatus(event.target.value)
                                        }
                                        aria-label="Filter by account status"
                                    >
                                        <option value="">
                                            {filipino
                                                ? "Lahat ng katayuan"
                                                : filipino
                                                  ? "Lahat ng katayuan"
                                                  : "All statuses"}
                                        </option>
                                        <option value="active">
                                            {filipino
                                                ? "Aktibo"
                                                : filipino
                                                  ? "Aktibo"
                                                  : "Active"}
                                        </option>
                                        <option value="suspended">
                                            Suspended
                                        </option>
                                    </select>
                                </label>
                                {hasFilters && (
                                    <button
                                        type="button"
                                        className="admin-reset-filters-btn"
                                        onClick={resetFilters}
                                    >
                                        Reset filters
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="admin-directory-toolbar-right">
                            <button
                                type="button"
                                className="admin-primary-button admin-add-seller-btn"
                                onClick={() => open("create")}
                            >
                                <Plus aria-hidden="true" />
                                <span>
                                    {filipino
                                        ? "Magdagdag"
                                        : filipino
                                          ? "Magdagdag"
                                          : "Add seller"}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="admin-directory-meta-bar">
                        <p className="admin-directory-count" role="status">
                            <strong>{filtered.length}</strong>{" "}
                            {filipino ? 'nagbebenta' : filtered.length === 1 ? "seller" : "sellers"}
                            {hasFilters && (
                                <span className="admin-filtered-tag">
                                    {filipino ? 'na-filter' : 'filtered'}
                                </span>
                            )}
                        </p>
                    </div>

                    {filtered.length ? (
                        <div className="admin-seller-table-wrap">
                            <div
                                className="admin-directory-header"
                                aria-hidden="true"
                            >
                                <span className="admin-col-avatar" />
                                <span className="admin-col-identity">
                                    Seller / Store
                                </span>
                                <span className="admin-col-barangay">
                                    Barangay
                                </span>
                                <span className="admin-col-listings">
                                    Listings
                                </span>
                                <span className="admin-col-status">Status</span>
                                <span className="admin-col-actions">
                                    Actions
                                </span>
                            </div>
                            <div className="admin-seller-list" role="list">
                                {paginated.map((seller) => (
                                    <article
                                        className="admin-seller-row"
                                        key={seller.id}
                                        role="listitem"
                                    >
                                        <SellerAvatar seller={seller} />
                                        <div className="admin-seller-identity">
                                            <strong>{seller.name}</strong>
                                            <span>{seller.email}</span>
                                        </div>
                                        <div className="admin-seller-meta admin-seller-meta--barangay">
                                            <span className="admin-seller-meta-label">
                                                Barangay
                                            </span>
                                            <span>
                                                <MapPin aria-hidden="true" />
                                                {seller.barangay ||
                                                    "Unassigned"}
                                            </span>
                                        </div>
                                        <div className="admin-seller-meta admin-seller-meta--listings">
                                            <span className="admin-seller-meta-label">
                                                Listings
                                            </span>
                                            <span>
                                                <Store aria-hidden="true" />
                                                {seller.productCount}
                                            </span>
                                        </div>
                                        <div className="admin-seller-status-wrap">
                                            <span
                                                className={`admin-status admin-status--${seller.status}`}
                                            >
                                                {seller.status === "active" ? (
                                                    <BadgeCheck aria-hidden="true" />
                                                ) : (
                                                    <ShieldAlert aria-hidden="true" />
                                                )}
                                                <span>{seller.status}</span>
                                            </span>
                                        </div>
                                        <div className="admin-seller-actions">
                                            <button
                                                type="button"
                                                className="admin-action-btn admin-action-btn--view"
                                                onClick={() =>
                                                    open("detail", seller)
                                                }
                                                aria-label={`View ${seller.name}`}
                                            >
                                                <Eye aria-hidden="true" />
                                                <span>View</span>
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-action-btn admin-action-btn--edit"
                                                onClick={() =>
                                                    open("edit", seller)
                                                }
                                                aria-label={`Edit ${seller.name}`}
                                            >
                                                <Pencil aria-hidden="true" />
                                                <span>Edit</span>
                                            </button>
                                            {seller.status === "active" ? (
                                                <button
                                                    type="button"
                                                    className="admin-action-btn admin-action-btn--suspend"
                                                    onClick={() =>
                                                        open("suspend", seller)
                                                    }
                                                    aria-label={`Suspend ${seller.name}`}
                                                >
                                                    <ShieldAlert aria-hidden="true" />
                                                    <span>Suspend</span>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className="admin-action-btn admin-action-btn--reinstate"
                                                    onClick={() =>
                                                        open(
                                                            "reinstate",
                                                            seller,
                                                        )
                                                    }
                                                    aria-label={`Reinstate ${seller.name}`}
                                                >
                                                    <BadgeCheck aria-hidden="true" />
                                                    <span>Reinstate</span>
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>

                            {/* Table Pagination */}
                            <Pagination page={page} pageSize={pageSize} totalItems={filtered.length} onPageChange={setPage} onPageSizeChange={setPageSize} filipino={filipino} label="Sellers table pagination" itemLabel={filipino ? "tala" : "sellers"} />
                        </div>
                    ) : (
                        <div className="admin-empty admin-seller-empty">
                            <div
                                className="admin-empty-icon"
                                aria-hidden="true"
                            >
                                <UserRound />
                            </div>
                            <strong>No sellers match your criteria</strong>
                            <p>
                                Try changing your search terms or clearing your
                                status and barangay filters.
                            </p>
                            {hasFilters && (
                                <button
                                    type="button"
                                    className="admin-secondary-button"
                                    onClick={resetFilters}
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    )}
                </section>
            </section>

            {mode === "create" && (
                <SellerForm barangays={barangays} onClose={close} />
            )}
            {mode === "edit" && (
                <SellerForm
                    seller={selected}
                    barangays={barangays}
                    onClose={close}
                />
            )}
            {mode === "detail" && (
                <SellerDetail seller={selected} onClose={close} filipino={filipino} />
            )}
            {mode === "suspend" && (
                <SuspendDialog seller={selected} onClose={close} filipino={filipino} />
            )}
            {mode === "reinstate" && (
                <ReinstateDialog seller={selected} onClose={close} filipino={filipino} />
            )}
        </>
    );
}

function SellerAvatar({ seller }) {
    return (
        <span
            className="admin-seller-photo admin-seller-avatar"
            aria-hidden="true"
        >
            {seller.photoUrl ? (
                <img src={seller.photoUrl} alt="" />
            ) : (
                seller.name?.slice(0, 1).toUpperCase()
            )}
        </span>
    );
}

function Dialog({
    title,
    subtitle,
    icon: Icon,
    children,
    onClose,
    variant = "default",
    filipino = false
}) {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="admin-dialog-backdrop"
            role="presentation"
            onMouseDown={onClose}
        >
            <section
                className={`admin-dialog admin-dialog--${variant}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="admin-dialog-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="admin-dialog-header">
                    <div className="admin-dialog-heading">
                        {Icon && (
                            <span
                                className={`admin-dialog-icon admin-dialog-icon--${variant}`}
                                aria-hidden="true"
                            >
                                <Icon />
                            </span>
                        )}
                        <div>
                            <h2 id="admin-dialog-title">{title}</h2>
                            {subtitle && (
                                <p className="admin-dialog-subtitle">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        type="button"
                        className="admin-dialog-close"
                        aria-label={filipino ? "Isara" : "Close dialog"}
                        onClick={onClose}
                    >
                        <X aria-hidden="true" />
                    </button>
                </header>
                <div className="admin-dialog-body">{children}</div>
            </section>
        </div>
    );
}

function SellerForm({ seller, barangays, onClose, filipino }) {
    const creating = !seller;
    const fileInputRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(seller?.photoUrl || null);

    const form = useForm(
        creating
            ? blankSeller
            : {
                  name: seller.name,
                  email: seller.email,
                  barangay: seller.barangay || "",
                  photo: null,
              },
    );

    const handlePhotoChange = (file) => {
        if (!file) {
            form.setData("photo", null);
            setPreviewUrl(seller?.photoUrl || null);
            return;
        }
        form.setData("photo", file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const handleClearPhoto = (event) => {
        event.stopPropagation();
        form.setData("photo", null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const submit = (event) => {
        event.preventDefault();
        const options = {
            forceFormData: Boolean(form.data.photo),
            preserveScroll: true,
            onSuccess: onClose,
        };
        if (creating) {
            form.post("/admin/sellers", options);
            return;
        }

        form.transform((data) => ({ ...data, _method: "patch" }));
        form.post(`/admin/sellers/${seller.id}`, options);
    };

    return (
        <Dialog
            title={creating ? (filipino ? "Gumawa ng account ng nagbebenta" : "Create seller account") : (filipino ? "I-edit ang account ng nagbebenta" : "Edit seller account")}
            subtitle={seller?.name}
            icon={creating ? UserPlus : FilePenLine}
            onClose={onClose}
            filipino={filipino}
        >
            <form className="admin-seller-form" onSubmit={submit} noValidate>
                <p className="admin-form-intro">
                    {creating
                        ? "Create a verified seller account for a farmer. Share the temporary password through your approved offline process."
                        : "Update the seller’s public store details and assigned barangay."}
                </p>

                <FormField label="Farm or store name" error={form.errors.name}>
                    <input
                        autoFocus
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData("name", event.target.value)
                        }
                        maxLength="255"
                        placeholder="e.g. Manggahan Urban Farm"
                        required
                    />
                </FormField>

                <FormField label="Email address" error={form.errors.email}>
                    <input
                        type="email"
                        value={form.data.email}
                        onChange={(event) =>
                            form.setData("email", event.target.value)
                        }
                        maxLength="255"
                        placeholder="seller@example.test"
                        required
                    />
                </FormField>

                <FormField
                    label="Assigned barangay"
                    error={form.errors.barangay}
                >
                    <select
                        value={form.data.barangay}
                        onChange={(event) =>
                            form.setData("barangay", event.target.value)
                        }
                        required
                    >
                        <option value="">Select barangay</option>
                        {barangays.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </FormField>

                {creating && (
                    <div className="admin-temp-password-wrapper">
                        <div className="admin-temp-password-fields">
                            <FormField
                                label="Temporary password"
                                error={form.errors.temporary_password}
                            >
                                <input
                                    type="password"
                                    value={form.data.temporary_password}
                                    onChange={(event) =>
                                        form.setData(
                                            "temporary_password",
                                            event.target.value,
                                        )
                                    }
                                    autoComplete="new-password"
                                    placeholder="Min. 8 characters"
                                    required
                                />
                            </FormField>
                            <FormField label="Confirm temporary password">
                                <input
                                    type="password"
                                    value={
                                        form.data
                                            .temporary_password_confirmation
                                    }
                                    onChange={(event) =>
                                        form.setData(
                                            "temporary_password_confirmation",
                                            event.target.value,
                                        )
                                    }
                                    autoComplete="new-password"
                                    placeholder="Min. 8 characters"
                                    required
                                />
                            </FormField>
                        </div>
                        <span className="admin-password-helper">
                            Both password fields must match and contain at least
                            8 characters.
                        </span>
                    </div>
                )}

                {/* Profile Photo Upload - Placed as the last form section */}
                <div className="admin-form-field admin-photo-upload-section">
                    <span className="admin-form-label">
                        Store photo (optional)
                    </span>
                    <input
                        ref={fileInputRef}
                        id="seller-photo-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) =>
                            handlePhotoChange(event.target.files?.[0] || null)
                        }
                    />

                    {previewUrl ? (
                        <div className="admin-photo-upload-preview">
                            <img
                                src={previewUrl}
                                alt="Store preview"
                                className="admin-photo-preview-thumb"
                            />
                            <div className="admin-photo-preview-info">
                                <strong>
                                    {form.data.photo?.name ||
                                        "Current store photo"}
                                </strong>
                                <span>JPG, PNG, or WebP</span>
                                <div className="admin-photo-preview-actions">
                                    <button
                                        type="button"
                                        className="admin-photo-btn admin-photo-btn--change"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                    >
                                        <Camera aria-hidden="true" />
                                        <span>Change photo</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-photo-btn admin-photo-btn--remove"
                                        onClick={handleClearPhoto}
                                    >
                                        <Trash2 aria-hidden="true" />
                                        <span>Remove</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="admin-photo-upload-dropzone"
                            onClick={() => fileInputRef.current?.click()}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    fileInputRef.current?.click();
                                }
                            }}
                        >
                            <div className="admin-photo-upload-empty">
                                <ImagePlus aria-hidden="true" />
                                <div>
                                    <strong>Upload storefront photo</strong>
                                    <p>PNG, JPG, or WebP up to 2 MB</p>
                                </div>
                                <span className="admin-photo-choose-tag">
                                    Browse file
                                </span>
                            </div>
                        </div>
                    )}
                    {form.errors.photo && (
                        <small className="admin-form-error">
                            {form.errors.photo}
                        </small>
                    )}
                </div>

                <DialogActions
                    onClose={onClose}
                    processing={form.processing}
                    action={creating ? (filipino ? 'Gumawa ng seller account' : 'Create seller') : (filipino ? 'I-save ang pagbabago' : 'Save changes')}
                    filipino={filipino}
                />
            </form>
        </Dialog>
    );
}

function SellerDetail({ seller, onClose, filipino }) {
    return (
        <Dialog
            title={filipino ? "Impormasyon ng nagbebenta" : "Seller profile information"}
            subtitle={seller.name}
            icon={Store}
            onClose={onClose}
            filipino={filipino}
        >
            <div className="admin-seller-detail">
                <div className="admin-seller-detail-profile">
                    <SellerAvatar seller={seller} />
                    <div className="admin-seller-detail-info">
                        <h3>{seller.name}</h3>
                        <p>{seller.email}</p>
                        <span>
                            <MapPin aria-hidden="true" />
                            {seller.barangay
                                ? `Barangay ${seller.barangay}`
                                : "Unassigned barangay"}
                        </span>
                    </div>
                    <span
                        className={`admin-status admin-status--${seller.status}`}
                    >
                        {seller.status === "active" ? (
                            <BadgeCheck aria-hidden="true" />
                        ) : (
                            <ShieldAlert aria-hidden="true" />
                        )}
                        <span>{seller.status}</span>
                    </span>
                </div>

                <dl className="admin-seller-detail-grid">
                    <div>
                        <dt>Account status</dt>
                        <dd>
                            <span
                                className={`admin-status-text admin-status-text--${seller.status}`}
                            >
                                {seller.status === "active"
                                    ? filipino
                                        ? "Aktibo"
                                        : "Active"
                                    : filipino
                                      ? "Mga Suspendido"
                                      : "Suspended"}
                            </span>
                        </dd>
                    </div>
                    <div>
                        <dt>Marketplace listings</dt>
                        <dd>
                            {seller.productCount}{" "}
                            {seller.productCount === 1 ? "listing" : "listings"}
                        </dd>
                    </div>
                    <div>
                        <dt>Account created</dt>
                        <dd>
                            {seller.createdAt
                                ? new Date(
                                      seller.createdAt,
                                  ).toLocaleDateString()
                                : "—"}
                        </dd>
                    </div>
                    <div>
                        <dt>Temporary password</dt>
                        <dd>
                            {seller.requiresPasswordChange ? (
                                <span className="admin-badge-warn">
                                    Waiting for replacement
                                </span>
                            ) : (
                                <span className="admin-badge-ok">
                                    Replaced by seller
                                </span>
                            )}
                        </dd>
                    </div>
                </dl>

                <section className="admin-status-history">
                    <h3>
                        <History aria-hidden="true" />
                        <span>Account history</span>
                    </h3>
                    {seller.history?.length ? (
                        <ol>
                            {seller.history.map((entry) => (
                                <li
                                    key={entry.id}
                                    className={`admin-history-item--${entry.action}`}
                                >
                                    <div className="admin-history-meta">
                                        <strong>
                                            {entry.action === "suspended"
                                                ? "Account suspended"
                                                : "Account reinstated"}
                                        </strong>
                                        <span>
                                            {new Date(
                                                entry.createdAt,
                                            ).toLocaleString()}{" "}
                                            · {entry.adminName}
                                        </span>
                                    </div>
                                    {entry.reason && <p>{entry.reason}</p>}
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p className="admin-history-empty">
                            No suspension or reinstatement actions are recorded.
                        </p>
                    )}
                </section>
            </div>
            <div className="admin-dialog-actions">
                <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={onClose}
                >
                    <ArrowLeft aria-hidden="true" />
                    <span>Back to list</span>
                </button>
            </div>
        </Dialog>
    );
}

function SuspendDialog({ seller, onClose, filipino }) {
    const [selectedCategory, setSelectedCategory] = useState(
        SUSPENSION_REASONS[0],
    );
    const [additionalNotes, setAdditionalNotes] = useState("");
    const form = useForm({ reason: "" });

    const submit = (event) => {
        event.preventDefault();
        const combinedReason = additionalNotes.trim()
            ? `${selectedCategory}: ${additionalNotes.trim()}`
            : selectedCategory;

        form.transform(() => ({ reason: combinedReason }));
        form.post(`/admin/sellers/${seller.id}/suspend`, {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog
            title={filipino ? 'I-suspend ang account ng nagbebenta' : 'Suspend seller account'}
            subtitle={seller.name}
            icon={ShieldAlert}
            onClose={onClose}
            filipino={filipino}
            variant="danger"
        >
            <form className="admin-seller-form" onSubmit={submit}>
                <div className="admin-dialog-alert admin-dialog-alert--danger">
                    <ShieldAlert aria-hidden="true" />
                    <div>
                        <strong>Suspension impact notice</strong>
                        <p>
                            Suspending <strong>{seller.name}</strong> will sign
                            them out immediately and restrict dashboard access.
                            Their public storefront and listings will be hidden
                            from buyers until reinstated.
                        </p>
                    </div>
                </div>

                <FormField
                    label="Reason for suspension"
                    error={form.errors.reason}
                >
                    <select
                        value={selectedCategory}
                        onChange={(event) =>
                            setSelectedCategory(event.target.value)
                        }
                        required
                    >
                        {SUSPENSION_REASONS.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </FormField>

                <FormField
                    label="Additional details (optional)"
                    hint="Optional context recorded in the CENRO administrative audit log."
                >
                    <textarea
                        value={additionalNotes}
                        onChange={(event) =>
                            setAdditionalNotes(event.target.value)
                        }
                        maxLength="1800"
                        placeholder="Provide any specific details or administrative notes (optional)..."
                        rows="3"
                    />
                </FormField>

                <DialogActions
                    onClose={onClose}
                    processing={form.processing}
                    action={filipino ? "I-suspend ang account" : "Suspend account"}
                    danger={true}
                    filipino={filipino}
                />
            </form>
        </Dialog>
    );
}

function ReinstateDialog({ seller, onClose, filipino }) {
    const form = useForm({});
    const submit = () =>
        form.post(`/admin/sellers/${seller.id}/reinstate`, {
            preserveScroll: true,
            onSuccess: onClose,
        });

    return (
        <Dialog
            title={filipino ? 'Ibalik ang account ng nagbebenta' : 'Reinstate seller account'}
            subtitle={seller.name}
            icon={ShieldCheck}
            onClose={onClose}
            filipino={filipino}
        >
            <form className="admin-seller-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <div className="admin-dialog-alert admin-dialog-alert--success">
                    <BadgeCheck aria-hidden="true" />
                    <div>
                        <strong>Confirm Account Reinstatement</strong>
                        <p>
                            You are about to reinstate the seller account for{" "}
                            <strong>{seller.name}</strong>. This will restore
                            their sign-in privileges and dashboard access, and
                            reactivate their public storefront and product
                            listings on the marketplace.
                        </p>
                    </div>
                </div>

                <p className="admin-dialog-note">
                    Audit tracking: The previous suspension record, reason, and
                    timeline will remain preserved in account history for
                    administrative tracking.
                </p>

                <DialogActions
                    onClose={onClose}
                    processing={form.processing}
                    action={filipino ? "Ibalik ang account" : "Reinstate account"}
                    filipino={filipino}
                />
            </form>
        </Dialog>
    );
}

function FormField({ label, error, hint, children }) {
    return (
        <div className="admin-form-field">
            <label className="admin-form-label-wrap">
                <span className="admin-form-label">{label}</span>
                {children}
            </label>
            {hint && !error && <span className="admin-form-hint">{hint}</span>}
            {error && <small className="admin-form-error">{error}</small>}
        </div>
    );
}

function DialogActions({
    onClose,
    processing,
    action,
    danger = false,
    onAction,
    filipino = false,
}) {
    return (
        <div className="admin-dialog-actions">
            <button
                type="button"
                className="admin-secondary-button"
                onClick={onClose}
                disabled={processing}
            >
                {filipino ? 'Kanselahin' : 'Cancel'}
            </button>
            {onAction ? (
                <button
                    type="button"
                    className={
                        danger ? "admin-danger-button" : "admin-primary-button"
                    }
                    disabled={processing}
                    onClick={onAction}
                >
                    {processing ? (filipino ? 'Pinoproseso…' : 'Working…') : action}
                </button>
            ) : (
                <button
                    type="submit"
                    className={
                        danger ? "admin-danger-button" : "admin-primary-button"
                    }
                    disabled={processing}
                >
                    {processing ? (filipino ? 'Pinoproseso…' : 'Working…') : action}
                </button>
            )}
        </div>
    );
}
