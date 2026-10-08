import { router } from "@inertiajs/react";
import Pagination from '../Seller/Pagination';
import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    ArrowUpDown,
    Calendar,
    FilePenLine,
    MapPin,
    RotateCcw,
    ScrollText,
    Search,
    ShieldAlert,
    ShieldCheck,
    UserPlus,
    X,
} from "lucide-react";

function getInitials(name) {
    if (!name) return "S";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

const ACTION_CONFIG = {
    suspend: { label: "Suspended account", Icon: ShieldAlert, cls: "suspend" },
    status_change: {
        label: "Status changed",
        Icon: RotateCcw,
        cls: "status_change",
    },
    reinstate: {
        label: "Reinstated account",
        Icon: ShieldCheck,
        cls: "reinstate",
    },
    create: { label: "Created seller account", Icon: UserPlus, cls: "create" },
    update: {
        label: "Updated seller details",
        Icon: FilePenLine,
        cls: "update",
    },
};

function ActionBadge({ actionType }) {
    const cfg = ACTION_CONFIG[actionType] ?? {
        label: actionType,
        Icon: ScrollText,
        cls: actionType,
    };
    return (
        <span className={`admin-audit-badge admin-audit-badge--${cfg.cls}`}>
            <cfg.Icon aria-hidden="true" />
            <span>{cfg.label}</span>
        </span>
    );
}

function AuditDetails({ details, filipino }) {
    if (!details) return <span className="admin-audit-details-none">—</span>;

    if (details.includes("→")) {
        const parts = details.split("→");
        const fromPart = parts[0].trim();
        const toPart = parts.slice(1).join("→").trim();
        let prefix = "";
        let fromState = fromPart;
        if (fromPart.includes(":")) {
            const i = fromPart.indexOf(":");
            prefix = fromPart.slice(0, i + 1).trim();
            fromState = fromPart.slice(i + 1).trim();
        }
        return (
            <span className="admin-audit-details-content">
                {prefix && (
                    <span className="admin-audit-details-prefix">
                        {prefix}{" "}
                    </span>
                )}
                <span className="admin-audit-transition">
                    <span className="admin-audit-state admin-audit-state--from">
                        {fromState}
                    </span>
                    <ArrowRight
                        className="admin-audit-arrow"
                        aria-hidden="true"
                    />
                    <span className="admin-audit-state admin-audit-state--to">
                        {toPart}
                    </span>
                </span>
            </span>
        );
    }

    if (details.startsWith(filipino ? "Dahilan:" : "Reason:")) {
        const text = details.replace(/^Reason:\s*/i, "").trim();
        return (
            <span className="admin-audit-details-content">
                <span className="admin-audit-reason-tag">{filipino ? "Dahilan:" : filipino ? "Dahilan:" : "Reason:"}</span>{" "}
                <span className="admin-audit-reason-text">{text}</span>
            </span>
        );
    }

    if (details.startsWith("Assigned to ")) {
        const brgy = details.replace(/^Assigned to\s*/i, "").trim();
        return (
            <span className="admin-audit-details-content">
                <MapPin className="admin-audit-mini-pin" aria-hidden="true" />
                Assigned to <strong>{brgy}</strong>
            </span>
        );
    }

    return <span className="admin-audit-details-text">{details}</span>;
}


const FILTER_OPTIONS = [
    { key: "all", label: "All actions" },
    { key: "suspend", label: "Suspensions" },
    { key: "status_change", label: "Status changes" },
    { key: "reinstate", label: "Reinstatements" },
    { key: "create", label: "Created accounts" },
    { key: "update", label: "Updated details" },
];

export default function AuditLogs({ logs = [], filipino }) {
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sortDesc, setSortDesc] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    useEffect(() => {
        const interval = window.setInterval(() => {
            router.reload({
                only: ["auditLogs"],
                preserveScroll: true,
                preserveState: true,
            });
        }, 30000);

        return () => window.clearInterval(interval);
    }, []);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [search, filterType, dateFrom, dateTo, sortDesc]);

    const filteredLogs = useMemo(() => {
        let result = [...logs];

        if (filterType !== "all") {
            result = result.filter((l) => l.actionType === filterType);
        }

        if (search.trim()) {
            const q = search.toLowerCase().trim();
            result = result.filter(
                (l) =>
                    l.seller?.name?.toLowerCase().includes(q) ||
                    l.seller?.barangay?.toLowerCase().includes(q) ||
                    l.action?.toLowerCase().includes(q) ||
                    l.details?.toLowerCase().includes(q),
            );
        }

        if (dateFrom) {
            const from = new Date(dateFrom);
            result = result.filter((l) => new Date(l.occurredAt) >= from);
        }

        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            result = result.filter((l) => new Date(l.occurredAt) <= to);
        }

        result.sort((a, b) => {
            const tA = new Date(a.occurredAt || 0).getTime();
            const tB = new Date(b.occurredAt || 0).getTime();
            return sortDesc ? tB - tA : tA - tB;
        });

        return result;
    }, [logs, filterType, search, dateFrom, dateTo, sortDesc]);

    const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);
    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredLogs.slice(start, start + pageSize);
    }, [filteredLogs, page, pageSize]);

    const hasFilters = Boolean(
        search || filterType !== "all" || dateFrom || dateTo,
    );
    const resetFilters = () => {
        setSearch("");
        setFilterType("all");
        setDateFrom("");
        setDateTo("");
    };

    if (!logs || logs.length === 0) {
        return (
            <>
                <h1 className="admin-page-title">{filipino ? "Mga Audit Log" : filipino ? "Mga Audit Log" : "Audit Logs"}</h1>
                <section className="admin-panel admin-section-empty">
                    <span className="admin-empty-icon" aria-hidden="true">
                        <ScrollText />
                    </span>
                    <strong>No audit activity recorded yet</strong>
                    <p>
                        Real administrative actions will appear here as seller
                        accounts are created, updated, suspended, or
                        reinstated.
                    </p>
                </section>
            </>
        );
    }

    return (
        <div className="admin-audit-section">
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{filipino ? "Mga Audit Log" : filipino ? "Mga Audit Log" : "Audit Logs"}</h1>
                    <p className="admin-page-subtitle">
                        Administrative activity, seller account status changes,
                        and profile management history. Updates refresh every
                        30 seconds.
                    </p>
                </div>
            </div>

            {/* Directory Panel — same pattern as Farmers & Sellers */}
            <section className="admin-panel admin-seller-directory">
                {/* Toolbar */}
                <div className="admin-directory-toolbar">
                    <div className="admin-directory-toolbar-left">
                        {/* Search */}
                        <div className="admin-search-field">
                            <Search aria-hidden="true" />
                            <label
                                htmlFor="admin-audit-search"
                                className="sr-only"
                            >
                                Search audit logs
                            </label>
                            <input
                                id="admin-audit-search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search action, seller, barangay, or details..."
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

                        {/* Filters */}
                        <div className="admin-filter-controls">
                            {/* Action type */}
                            <label className="admin-filter-select-wrap">
                                <span className="sr-only">
                                    Filter by action type
                                </span>
                                <select
                                    value={filterType}
                                    onChange={(e) =>
                                        setFilterType(e.target.value)
                                    }
                                    aria-label="Filter by action type"
                                >
                                    {FILTER_OPTIONS.map(({ key, label }) => (
                                        <option key={key} value={key}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {/* Date from */}
                            <label className="admin-filter-date-wrap">
                                <span className="sr-only">From date</span>
                                <Calendar
                                    className="admin-filter-date-icon"
                                    aria-hidden="true"
                                />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) =>
                                        setDateFrom(e.target.value)
                                    }
                                    aria-label="Filter from date"
                                    title="From date"
                                />
                            </label>

                            {/* Date to */}
                            <label className="admin-filter-date-wrap">
                                <span className="sr-only">To date</span>
                                <Calendar
                                    className="admin-filter-date-icon"
                                    aria-hidden="true"
                                />
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    aria-label="Filter to date"
                                    title="To date"
                                />
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
                </div>

                {/* Meta bar */}
                <div className="admin-directory-meta-bar">
                    <p className="admin-directory-count" role="status">
                        <strong>{filteredLogs.length}</strong>{" "}
                        {filipino ? 'tala' : filteredLogs.length === 1 ? "entry" : "entries"}
                        {hasFilters && (
                            <span className="admin-filtered-tag">{filipino ? 'na-filter' : 'filtered'}</span>
                        )}
                    </p>
                    {/* Sort toggle */}
                    <button
                        type="button"
                        className="admin-audit-sort-btn"
                        onClick={() => setSortDesc((p) => !p)}
                        aria-label={`Sort by time — currently ${sortDesc ? "newest first" : "oldest first"}`}
                    >
                        <ArrowUpDown aria-hidden="true" />
                        <span>
                            {sortDesc ? filipino ? "Pinakabago" : "Newest first" : filipino ? "Pinakaluma" : "Oldest first"}
                        </span>
                    </button>
                </div>

                {filteredLogs.length > 0 ? (
                    <div className="admin-seller-table-wrap">
                        {/* Header row — identical pattern to FarmersSellers */}
                        <div
                            className="admin-directory-header admin-audit-directory-header"
                            aria-hidden="true"
                        >
                            <span className="admin-audit-col-avatar" />
                            <span className="admin-audit-col-seller">
                                Seller
                            </span>
                            <span className="admin-audit-col-action">
                                Admin action
                            </span>
                            <span className="admin-audit-col-details">
                                Details
                            </span>
                            <span className="admin-audit-col-time">{filipino ? "Oras" : filipino ? "Oras" : "Time"}</span>
                        </div>

                        {/* Rows */}
                        <div className="admin-seller-list" role="list">
                            {paginated.map((log) => (
                                <article
                                    key={log.id}
                                    className="admin-seller-row admin-audit-row"
                                    role="listitem"
                                >
                                    {/* Avatar */}
                                    <span
                                        className="admin-seller-photo admin-audit-avatar-cell"
                                        aria-hidden="true"
                                    >
                                        {log.seller?.avatarUrl ? (
                                            <img
                                                src={log.seller.avatarUrl}
                                                alt=""
                                            />
                                        ) : (
                                            getInitials(log.seller?.name)
                                        )}
                                    </span>

                                    {/* Seller identity */}
                                    <div className="admin-seller-identity">
                                        <strong>
                                            {log.seller?.name ||
                                                "Unknown Seller"}
                                        </strong>
                                        {log.seller?.barangay && (
                                            <span className="admin-audit-barangay-sub">
                                                <MapPin aria-hidden="true" />
                                                {log.seller.barangay}
                                            </span>
                                        )}
                                    </div>

                                    {/* Action badge */}
                                    <div className="admin-audit-action-cell">
                                        <ActionBadge
                                            actionType={log.actionType}
                                        />
                                    </div>

                                    {/* Details */}
                                    <div className="admin-audit-details-cell">
                                        <AuditDetails details={log.details} filipino={filipino} />
                                    </div>

                                    {/* Time */}
                                    <div className="admin-audit-time-col">
                                        <time dateTime={log.occurredAt}>
                                            {log.timeFormatted}
                                        </time>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {/* Pagination */}
                        <Pagination page={page} pageSize={pageSize} totalItems={filteredLogs.length} onPageChange={setPage} onPageSizeChange={setPageSize} filipino={filipino} label={filipino ? "Mga pahina ng audit log" : "Audit logs pagination"} itemLabel={filipino ? "tala" : "entries"} />
                    </div>
                ) : (
                    <div className="admin-empty admin-seller-empty">
                        <div className="admin-empty-icon" aria-hidden="true">
                            <ScrollText />
                        </div>
                        <strong>No matching audit log records</strong>
                        <p>
                            Try changing your search terms or clearing your
                            filters.
                        </p>
                        {hasFilters && (
                            <button
                                type="button"
                                className="admin-reset-filters-btn"
                                style={{ marginTop: 12 }}
                                onClick={resetFilters}
                            >
                                Reset filters
                            </button>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
