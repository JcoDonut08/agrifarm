import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import {
    Apple,
    Bell,
    CalendarClock,
    Carrot,
    ChartNoAxesCombined,
    ChevronDown,
    Check,
    Citrus,
    Clock3,
    CloudRain,
    FileChartColumn,
    LayoutDashboard,
    Leaf,
    ListChecks,
    LogOut,
    MapPinned,
    Menu,
    Package,
    PackageCheck,
    PackageOpen,
    PackageSearch,
    PackageX,
    Plus,
    Salad,
    ScrollText,
    Settings,
    ShoppingBag,
    Sprout,
    Store,
    TrendingUp,
    Trash2,
    Truck,
    UserCheck,
    UserRound,
    UsersRound,
    Wheat,
    X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import AppMark from "../../Components/AppMark";
import FormStatus from '../../Components/FormStatus';
import ConfirmationDialog from '../../Components/ConfirmationDialog';
import "../../../css/seller.css";
import "../../../css/admin.css";
import WeatherCard from "../Seller/WeatherCard";
import Avatar from "../Seller/Avatar";
import Profile from "./Profile";
import AdminSettings from "./Settings";
import FarmersSellers from "./FarmersSellers";
import Pagination from '../Seller/Pagination';
import useTablePagination from '../../Components/useTablePagination';
import AuditLogs from "./AuditLogs";
import BarangayMonitoring from "./BarangayMonitoring";
import AdminProducts from "./Products";
import AdminOrders from "./Orders";
import AdminReports from "./Reports";

const ADMIN_EMAIL = "pasigcenro@gmail.com";
const ADMIN_PREFERENCES_KEY = "agrifarm-admin-preferences";
const defaultAdminPreferences = {
    language: "english",
    display: { showWeather: true, showRecentActivity: true },
    notifications: {
        sellerActivity: true,
        orderAttention: true,
        inventoryAlerts: true,
        weatherAlerts: true,
    },
};

const sections = [
    {
        label: "Dashboard",
        labelFilipino: "Dashboard",
        slug: null,
        icon: LayoutDashboard,
    },
    {
        label: "Barangay Monitoring",
        labelFilipino: "Pagbabantay sa Barangay",
        slug: "barangay-monitoring",
        icon: MapPinned,
    },
    {
        label: "Farmers & Sellers",
        labelFilipino: "Mga Magsasaka't Nagbebenta",
        slug: "farmers-sellers",
        icon: UsersRound,
    },
    {
        label: "Products",
        labelFilipino: "Mga Produkto",
        slug: "products",
        icon: Sprout,
    },
    {
        label: "Orders",
        labelFilipino: "Mga Order",
        slug: "orders",
        icon: ShoppingBag,
    },
    {
        label: "Reports",
        labelFilipino: "Mga Ulat",
        slug: "reports",
        icon: FileChartColumn,
    },
    {
        label: "Audit Logs",
        labelFilipino: "Mga Audit Log",
        slug: "audit-logs",
        icon: ScrollText,
    },
    {
        label: "Profile",
        labelFilipino: "Profile",
        slug: "profile",
        icon: UserRound,
    },
    {
        label: "Settings",
        labelFilipino: "Mga Setting",
        slug: "settings",
        icon: Settings,
    },
];

const emptyStateCopy = {
    "Barangay Monitoring": {
        title: "No barangay monitoring records yet",
        titleFilipino: "Wala pang mga talaan sa pagbabantay ng barangay",
        detail: "Barangay participation, registered urban farms, and local activity will appear here once monitoring records are available.",
        detailFilipino:
            "Ang pakikilahok ng barangay, mga rehistradong urban farm, at aktibidad ay lalabas dito kapag mayroon nang mga talaan.",
    },
    "Farmers & Sellers": {
        title: "No farmers or sellers to review yet",
        titleFilipino: "Wala pang mga magsasaka o nagbebenta na pwedeng suriin",
        detail: "Registered farmer and seller profiles will be organized here for CENRO verification and monitoring.",
        detailFilipino:
            "Aayusin dito ang mga profile ng mga rehistradong magsasaka at nagbebenta para sa CENRO verification.",
    },
    Products: {
        title: "No products to monitor yet",
        titleFilipino: "Wala pang mga produktong babantayan",
        detail: "Products listed by approved sellers will appear here for marketplace-wide oversight.",
        detailFilipino:
            "Ang mga produktong idinagdag ng mga aprubadong nagbebenta ay lalabas dito.",
    },
    Orders: {
        title: "No orders recorded yet",
        titleFilipino: "Wala pang mga order na naitala",
        detail: "Marketplace orders will appear here as customers begin purchasing from Pasig urban farmers.",
        detailFilipino:
            "Ang mga order sa marketplace ay lalabas dito kapag may bumili na sa mga urban farmers ng Pasig.",
    },
    Reports: {
        title: "No report data available yet",
        titleFilipino: "Wala pang mga ulat na available",
        detail: "Summary reports will become available after barangays, sellers, products, and orders have recorded activity.",
        detailFilipino:
            "Ang mga summary report ay magiging available kapag nagkaroon na ng aktibidad.",
    },
    "Audit Logs": {
        title: "No audit activity recorded yet",
        titleFilipino: "Wala pang naitalang aktibidad ng audit",
        detail: "Administrative actions and account changes will appear here once audit tracking records are available.",
        detailFilipino:
            "Ang mga pagbabago sa account at iba pang administrative actions ay lalabas dito.",
    },
    Settings: {
        title: "No settings are configured yet",
        titleFilipino: "Wala pang mga setting na na-configure",
        detail: "Administrative preferences and access controls will appear here when they are ready for setup.",
        detailFilipino: "Ang mga setting ng administration ay lalabas dito.",
    },
};

function initialSection() {
    const requested = new URLSearchParams(window.location.search).get(
        "section",
    );
    return (
        sections.find(({ slug }) => slug === requested)?.label || "Dashboard"
    );
}

function savedAdminPreferences() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(ADMIN_PREFERENCES_KEY) || "{}",
        );
        return {
            language: saved.language || defaultAdminPreferences.language,
            display: {
                ...defaultAdminPreferences.display,
                ...(saved.display || {}),
            },
            notifications: {
                ...defaultAdminPreferences.notifications,
                ...(saved.notifications || {}),
            },
        };
    } catch {
        return defaultAdminPreferences;
    }
}

function buildAdminAlerts(attention = {}, weather, preferences) {
    const alerts = [];

    if (preferences.sellerActivity && attention.recentSellers)
        alerts.push({
            icon: UsersRound,
            title: "Partner seller activity",
            titleFilipino: "Aktibidad ng partner seller",
            detail: `${attention.recentSellers} recently added ${attention.recentSellers === 1 ? "account is" : "accounts are"} ready for monitoring.`,
            detailFilipino: `May ${attention.recentSellers} bagong seller ${attention.recentSellers === 1 ? "account" : "accounts"} na handa nang i-monitor.`,
        });
    if (preferences.orderAttention && attention.pendingOrders)
        alerts.push({
            icon: ShoppingBag,
            title: "Orders need attention",
            titleFilipino: "Mga order na kailangang asikasuhin",
            detail: `${attention.pendingOrders} pending ${attention.pendingOrders === 1 ? "order needs" : "orders need"} seller action.`,
            detailFilipino: `May ${attention.pendingOrders} nakabinbing order na nangangailangan ng aksyon ng nagbebenta.`,
        });
    if (preferences.inventoryAlerts && attention.lowStockProducts)
        alerts.push({
            icon: PackageSearch,
            title: "Inventory needs review",
            titleFilipino: "Kailangang suriin ang imbentaryo",
            detail: `${attention.lowStockProducts} ${attention.lowStockProducts === 1 ? "product is" : "products are"} at or below the stock threshold.`,
            detailFilipino: `May ${attention.lowStockProducts} produkto na malapit nang maubos o ubos na.`,
        });

    const weatherKey =
        `${weather?.condition_key || ""} ${weather?.condition || ""}`.toLowerCase();
    if (
        preferences.weatherAlerts &&
        (weatherKey.includes("storm") ||
            weatherKey.includes("thunder") ||
            Number(weather?.rain_chance_percent) >= 70)
    )
        alerts.push({
            icon: CloudRain,
            title: "Pasig weather advisory",
            titleFilipino: "Abiso sa panahon sa Pasig",
            detail: "Heavy rain is possible. Monitor conditions across partner barangays.",
            detailFilipino:
                "Posible ang malakas na pag-ulan. Bantayan ang sitwasyon sa mga partner na barangay.",
        });

    return alerts;
}

export default function Dashboard() {
    const {
        auth,
        flash,
        dashboard,
        sellerManagement,
        auditLogs = [],
        monitoringData,
        weather = null,
        productManagement,
        orderManagement,
        reportData = {},
    } = usePage().props;
    const [section, setSection] = useState(initialSection);
    const [menuOpen, setMenuOpen] = useState(false);
    const [preferences, setPreferences] = useState(savedAdminPreferences);
    const menuButton = useRef(null);
    const notificationAlerts = buildAdminAlerts(
        dashboard?.attention,
        weather,
        preferences.notifications,
    );

    useEffect(() => {
        if (!menuOpen) return undefined;

        const closeOnEscape = (event) => {
            if (event.key === "Escape") {
                setMenuOpen(false);
                menuButton.current?.focus();
            }
        };

        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [menuOpen]);

    const navigate = (nextSection) => {
        const destination = sections.find(({ label }) => label === nextSection);
        const url = new URL(window.location.href);

        if (destination?.slug)
            url.searchParams.set("section", destination.slug);
        else url.searchParams.delete("section");

        window.history.replaceState({}, "", url);
        setSection(nextSection);
        setMenuOpen(false);
    };

    const changePreference = (group, key, enabled) => {
        setPreferences((current) => {
            const next =
                key !== undefined
                    ? {
                          ...current,
                          [group]: { ...current[group], [key]: enabled },
                      }
                    : {
                          ...current,
                          [group]: enabled,
                      };
            try {
                localStorage.setItem(
                    ADMIN_PREFERENCES_KEY,
                    JSON.stringify(next),
                );
            } catch {
                /* Keep the current session usable without storage. */
            }
            return next;
        });
    };

    const filipino = preferences.language === "filipino";

    return (
        <div className="admin-app">
            <Head title={`${section} · Pasig CENRO`} />

            <aside className="admin-sidebar">
                <div className="admin-brand">
                    <AppMark storefront href="/admin/dashboard" />
                    <span>Pasig CENRO</span>
                </div>

                <button
                    ref={menuButton}
                    type="button"
                    className="admin-menu-toggle"
                    aria-label={
                        menuOpen
                            ? filipino
                                ? "Isara ang navigation"
                                : "Close admin navigation"
                            : filipino
                              ? "Buksan ang navigation"
                              : "Open admin navigation"
                    }
                    aria-expanded={menuOpen}
                    aria-controls="admin-navigation"
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    {menuOpen ? <X /> : <Menu />}
                </button>

                <div
                    id="admin-navigation"
                    className={`admin-navigation ${menuOpen ? "is-open" : ""}`}
                >
                    <nav
                        className="admin-nav"
                        aria-label={
                            filipino
                                ? "Administrasyon ng CENRO"
                                : "CENRO administration"
                        }
                    >
                        {sections.map(
                            ({ label, labelFilipino, icon: Icon }) => (
                                <button
                                    key={label}
                                    type="button"
                                    aria-current={
                                        section === label ? "page" : undefined
                                    }
                                    onClick={() => navigate(label)}
                                >
                                    <Icon />
                                    <span>
                                        {filipino ? labelFilipino : label}
                                    </span>
                                </button>
                            ),
                        )}
                    </nav>

                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="admin-logout"
                    >
                        <LogOut />
                        <span>{filipino ? "Mag-logout" : "Logout"}</span>
                    </Link>

                    <div className="admin-profile">
                        <span className="admin-avatar" aria-hidden="true">
                            {auth?.user?.avatar_url ? (
                                <img src={auth.user.avatar_url} alt="" />
                            ) : (
                                "PC"
                            )}
                        </span>
                        <span className="admin-profile-copy">
                            <strong>Pasig CENRO</strong>
                            <small>{ADMIN_EMAIL}</small>
                        </span>
                    </div>
                </div>
            </aside>

            <div className="admin-workspace">
                <header className="admin-topbar">
                    <span className="admin-location">
                        <MapPinned />
                        Pasig City
                    </span>
                    <div className="admin-topbar-actions">
                        <AdminNotifications
                            alerts={notificationAlerts}
                            filipino={filipino}
                        />
                        <button
                            type="button"
                            className="admin-account-button"
                            aria-label={
                                filipino
                                    ? "Buksan ang admin account"
                                    : "Open administrator account"
                            }
                            onClick={() => navigate("Profile")}
                        >
                            <span className="admin-avatar" aria-hidden="true">
                                {auth?.user?.avatar_url ? (
                                    <img src={auth.user.avatar_url} alt="" />
                                ) : (
                                    "PC"
                                )}
                            </span>
                            <span>
                                <strong>
                                    {auth?.user?.name || "Pasig CENRO"}
                                </strong>
                                <small>
                                    {filipino
                                        ? "Administrador"
                                        : "Administrator"}
                                </small>
                            </span>
                            <ChevronDown />
                        </button>
                    </div>
                </header>

                <main className="admin-main">
                    <FormStatus dismissible messageId={flash?.id} dismissLabel={filipino ? 'Isara ang mensahe' : 'Dismiss message'}>{filipino ? ({ 'Profile photo updated successfully.': 'Na-update ang larawan sa profile.', 'Profile photo removed.': 'Inalis ang larawan sa profile.', 'Task added.': 'Naidagdag ang gawain.', 'Task completed.': 'Natapos ang gawain.', 'Task reopened.': 'Muling binuksan ang gawain.', 'Task deleted.': 'Nabura ang gawain.', 'Seller details updated.': 'Na-update ang detalye ng seller.' }[flash?.status] || flash?.status) : flash?.status}</FormStatus>
                    {section === "Dashboard" ? (
                        <DashboardOverview
                            dashboard={dashboard}
                            weather={weather}
                            preferences={preferences.display}
                            filipino={filipino}
                        />
                    ) : section === "Products" ? (
                        <AdminProducts productManagement={productManagement} filipino={filipino} />
                    ) : section === "Orders" ? (
                        <AdminOrders orderManagement={orderManagement} filipino={filipino} />
                    ) : section === "Farmers & Sellers" ? (
                        <FarmersSellers
                            management={sellerManagement}
                            filipino={filipino}
                        />
                    ) : section === "Audit Logs" ? (
                        <AuditLogs logs={auditLogs} filipino={filipino} />
                    ) : section === "Barangay Monitoring" ? (
                        <BarangayMonitoring monitoringData={monitoringData} filipino={filipino} />
                    ) : section === "Reports" ? (
                        <AdminReports
                            harvestRecords={reportData.harvestRecords ?? []}
                            walkInOrders={reportData.walkInOrders ?? []}
                            sellers={reportData.sellers ?? []}
                            pendingRegistrations={reportData.pendingRegistrations ?? []}
                            barangays={sellerManagement.barangays ?? []}
                            filipino={filipino}
                        />
                    ) : section === "Profile" ? (
                        <Profile
                            user={auth.user}
                            email={ADMIN_EMAIL}
                            filipino={filipino}
                        />
                    ) : section === "Settings" ? (
                        <AdminSettings
                            preferences={preferences}
                            onPreferenceChange={changePreference}
                        />
                    ) : (
                        <SectionEmptyState
                            section={section}
                            filipino={filipino}
                        />
                    )}
                    <footer className="admin-footer">
                        AgriFarm · Pasig City CENRO Administration
                    </footer>
                </main>
            </div>
        </div>
    );
}

function AdminNotifications({ alerts, filipino }) {
    const [open, setOpen] = useState(false);
    const container = useRef(null);
    const trigger = useRef(null);

    useEffect(() => {
        if (!open) return undefined;

        const closeOutside = (event) => {
            if (!container.current?.contains(event.target)) setOpen(false);
        };
        const closeOnEscape = (event) => {
            if (event.key === "Escape") {
                setOpen(false);
                trigger.current?.focus();
            }
        };

        document.addEventListener("pointerdown", closeOutside);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("pointerdown", closeOutside);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [open]);

    return (
        <div
            className="admin-notifications"
            ref={container}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                    setOpen(false);
            }}
        >
            <button
                ref={trigger}
                type="button"
                className="admin-icon-button"
                aria-label="Notifications"
                aria-expanded={open}
                aria-controls="admin-notification-panel"
                onClick={() => setOpen((current) => !current)}
            >
                <Bell />
                {alerts.length > 0 && (
                    <span className="admin-notification-count">
                        {alerts.length}
                    </span>
                )}
            </button>
            {open && (
                <section
                    id="admin-notification-panel"
                    className="admin-notification-panel"
                    aria-label="Administration notifications"
                >
                    <header>
                        <div>
                            <strong>
                                {filipino
                                    ? "Mga Notipikasyon"
                                    : "Notifications"}
                            </strong>
                            <span>
                                {alerts.length
                                    ? filipino
                                        ? `${alerts.length} ang kailangang asikasuhin`
                                        : `${alerts.length} requiring attention`
                                    : filipino
                                      ? "Wala pang kailangang asikasuhin"
                                      : "All caught up"}
                            </span>
                        </div>
                        <button
                            type="button"
                            aria-label={
                                filipino
                                    ? "Isara ang mga notipikasyon"
                                    : "Close notifications"
                            }
                            onClick={() => {
                                setOpen(false);
                                trigger.current?.focus();
                            }}
                        >
                            <X />
                        </button>
                    </header>
                    {alerts.length ? (
                        <ul>
                            {alerts.map(
                                ({
                                    icon: Icon,
                                    title,
                                    detail,
                                    titleFilipino,
                                    detailFilipino,
                                }) => (
                                    <li key={title}>
                                        <span>
                                            <Icon />
                                        </span>
                                        <div>
                                            <strong>
                                                {filipino && titleFilipino
                                                    ? titleFilipino
                                                    : title}
                                            </strong>
                                            <p>
                                                {filipino && detailFilipino
                                                    ? detailFilipino
                                                    : detail}
                                            </p>
                                        </div>
                                    </li>
                                ),
                            )}
                        </ul>
                    ) : (
                        <div className="admin-notification-empty">
                            <Bell />
                            <strong>
                                {filipino
                                    ? "Wala pang notipikasyon"
                                    : "No notifications yet"}
                            </strong>
                            <p>
                                {filipino
                                    ? "Dito lalabas ang mga alerto para sa CENRO monitoring."
                                    : "Enabled CENRO monitoring alerts will appear here."}
                            </p>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}

function DashboardOverview({ dashboard = {}, weather, preferences, filipino }) {
    const summary = dashboard.summary || {};
    const barangays = dashboard.barangays || [];
    const barangayPages = useTablePagination(barangays);
    const monthlySales = dashboard.monthlySales || { months: [], series: [] };
    const todo = dashboard.todo || [];
    const recentActivity = dashboard.recentActivity || [];
    const highestBarangaySale = Math.max(
        ...barangays.map((barangay) => Number(barangay.sales)),
        0,
    );
    const metrics = [
        {
            label: filipino ? "Kabuuang benta" : "Total sales",
            value: formatCurrency(summary.totalSales || 0),
            detail: summary.completedOrders
                ? filipino
                    ? `${summary.completedOrders} nakumpletong ${summary.completedOrders === 1 ? "order" : "mga order"}`
                    : `${summary.completedOrders} completed ${summary.completedOrders === 1 ? "order" : "orders"}`
                : filipino
                  ? "Wala pang nakumpletong benta"
                  : "No completed sales yet",
            icon: TrendingUp,
        },
        {
            label: filipino ? "Mga aktibong nagbebenta" : "Active sellers",
            value: formatNumber(summary.activeSellers || 0),
            detail: summary.activeSellers
                ? filipino
                    ? "Mga beripikadong account"
                    : "Verified seller accounts"
                : filipino
                  ? "Wala pang aktibong nagbebenta"
                  : "No active sellers yet",
            icon: UsersRound,
        },
        {
            label: filipino ? "Kabuuang mga order" : "Total orders",
            value: formatNumber(summary.totalOrders || 0),
            detail: summary.totalOrders
                ? filipino
                    ? "Mula sa lahat ng nagbebenta sa marketplace"
                    : "Across all marketplace sellers"
                : filipino
                  ? "Wala pang nai-record na order"
                  : "No orders recorded yet",
            icon: ShoppingBag,
        },
        {
            label: filipino ? "Nangungunang barangay" : "Leading barangay",
            value: summary.leadingBarangay?.name || "—",
            detail: summary.leadingBarangay
                ? filipino
                    ? `${formatCurrency(summary.leadingBarangay.sales)} na nakumpletong benta`
                    : `${formatCurrency(summary.leadingBarangay.sales)} completed sales`
                : filipino
                  ? "Wala pang benta sa barangay"
                  : "No barangay sales yet",
            icon: MapPinned,
            compact: true,
        },
    ];

    return (
        <>
            <h1 className="sr-only">Dashboard</h1>

            <section className="admin-metrics" aria-label="Marketplace totals">
                {metrics.map(
                    ({ label, value, detail, icon: Icon, compact }) => (
                        <article
                            key={label}
                            className={`admin-metric-card ${compact ? "admin-metric-card--name" : ""}`}
                        >
                            <div className="admin-metric-heading">
                                <h2>{label}</h2>
                                <span
                                    className="admin-metric-icon"
                                    aria-hidden="true"
                                >
                                    <Icon />
                                </span>
                            </div>
                            <strong className="admin-metric-value">
                                {value}
                            </strong>
                            <p>{detail}</p>
                        </article>
                    ),
                )}
            </section>

            <section className="admin-dashboard-grid">
                <article className="admin-panel">
                    <div className="admin-panel-heading">
                        <div>
                            <h2>
                                <ChartNoAxesCombined aria-hidden="true" />
                                {filipino
                                    ? "Pangkalahatang-ideya sa pagganap ng barangay"
                                    : "Barangay performance overview"}
                            </h2>
                            <p>
                                {filipino
                                    ? "Paghahambing ng mga nakumpletong benta at order"
                                    : "Completed sales and order comparison"}
                            </p>
                        </div>
                    </div>
                    {barangays.length ? (
                        <div className="admin-performance-table">
                            <div
                                className="admin-performance-header"
                                aria-hidden="true"
                            >
                                <span>
                                    {filipino ? "Barangay" : "Barangay"}
                                </span>
                                <span>
                                    {filipino
                                        ? "Kabuuang benta"
                                        : "Total sales"}
                                </span>
                                <span>{filipino ? "Mga order" : "Orders"}</span>
                            </div>
                            <div className="admin-performance-list">
                                {barangayPages.visibleItems.map((barangay) => (
                                    <article
                                        className="admin-performance-item"
                                        key={barangay.id}
                                    >
                                        <div className="admin-performance-title">
                                            <Avatar
                                                user={{
                                                    name: barangay.sellerName,
                                                    avatar_url:
                                                        barangay.avatarUrl,
                                                }}
                                                className="admin-seller-avatar"
                                            />
                                            <div>
                                                <strong>{barangay.name}</strong>
                                                <small>
                                                    {barangay.sellerName}
                                                </small>
                                            </div>
                                        </div>
                                        <div className="admin-performance-sales">
                                            <strong>
                                                {formatCurrency(barangay.sales)}
                                            </strong>
                                            <span>
                                                <i
                                                    style={{
                                                        width: `${highestBarangaySale ? (Number(barangay.sales) / highestBarangaySale) * 100 : 0}%`,
                                                    }}
                                                />
                                            </span>
                                        </div>
                                        <div className="admin-performance-orders">
                                            <strong>
                                                {formatNumber(barangay.orders)}
                                            </strong>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <Pagination page={barangayPages.page} pageSize={barangayPages.pageSize} totalItems={barangays.length} onPageChange={barangayPages.setPage} onPageSizeChange={barangayPages.setPageSize} filipino={filipino} label="Barangay performance pagination" itemLabel="barangays" />
                        </div>
                    ) : (
                        <div className="admin-empty">
                            <EmptyIllustration icon={ChartNoAxesCombined} />
                            <strong>
                                {filipino
                                    ? "Wala pang datos ng pagganap ng barangay"
                                    : "No barangay performance data yet"}
                            </strong>
                            <p>
                                {filipino
                                    ? "Ihahambing dito ang mga benta, order, aktibong nagbebenta, at produkto kapag nagsimula na ang aktibidad."
                                    : "Sales, orders, active sellers, and products will be compared here once activity begins."}
                            </p>
                        </div>
                    )}
                </article>

                <AdminTodoPanel tasks={todo} filipino={filipino} />
            </section>

            <section
                className={`admin-dashboard-grid admin-dashboard-grid--insights ${!preferences.showRecentActivity ? "admin-dashboard-grid--single" : ""}`}
            >
                <article className="admin-panel admin-sales-panel">
                    <div className="admin-panel-heading">
                        <div>
                            <h2>
                                <TrendingUp aria-hidden="true" />
                                {filipino
                                    ? "Takbo ng benta buwan-buwan"
                                    : "Monthly sales trend"}
                            </h2>
                            <p>
                                {filipino
                                    ? "Mga nakumpletong benta sa mga partner na barangay"
                                    : "Completed sales across partner barangays"}
                            </p>
                        </div>
                    </div>
                    {monthlySales.series?.some((series) =>
                        series.sales.some((sale) => Number(sale) > 0),
                    ) ? (
                        <MonthlySalesChart data={monthlySales} />
                    ) : (
                        <div className="admin-empty">
                            <EmptyIllustration icon={TrendingUp} />
                            <strong>
                                {filipino
                                    ? "Wala pang nakumpletong benta"
                                    : "No completed sales yet"}
                            </strong>
                            <p>
                                {filipino
                                    ? "Lalabas dito ang kabuuan ng mga nakumpletong benta buwan-buwan at order kapag may datos na ng transaksyon."
                                    : "Monthly completed sales and order totals will appear here when transaction data is available."}
                            </p>
                        </div>
                    )}
                </article>

                {preferences.showRecentActivity && (
                    <article className="admin-panel">
                        <div className="admin-panel-heading">
                            <h2>
                                <Store aria-hidden="true" />
                                {filipino
                                    ? "Kamakailang aktibidad"
                                    : "Recent activity"}
                            </h2>
                        </div>
                        {recentActivity.length ? (
                            <div className="admin-activity-list">
                                {recentActivity.map((activity) => (
                                    <article key={activity.id}>
                                        <ActivityThumbnail
                                            activity={activity}
                                        />
                                        <div>
                                            <strong>
                                                {filipino &&
                                                activity.titleFilipino
                                                    ? activity.titleFilipino
                                                    : activity.title}
                                            </strong>
                                            <small>
                                                {filipino &&
                                                activity.detailFilipino
                                                    ? activity.detailFilipino
                                                    : activity.detail}
                                            </small>
                                        </div>
                                        <time dateTime={activity.occurredAt}>
                                            <Clock3 />
                                            {formatRelativeTime(
                                                activity.occurredAt,
                                            )}
                                        </time>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="admin-empty">
                                <EmptyIllustration icon={PackageOpen} />
                                <strong>
                                    {filipino
                                        ? "Walang aktibidad na maipapakita"
                                        : "No activity to show"}
                                </strong>
                                <p>
                                    {filipino
                                        ? "Lalabas dito ang mga bagong nagbebenta, produkto, at order."
                                        : "New sellers, products, and orders will appear here."}
                                </p>
                            </div>
                        )}
                    </article>
                )}
            </section>

            {preferences.showWeather && (
                <div className="admin-weather-panel">
                    <WeatherCard
                        weather={weather}
                        title="Weather & barangay outlook"
                        compact
                    />
                </div>
            )}
        </>
    );
}

function AdminTodoPanel({ tasks, filipino }) {
    const [adding, setAdding] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const form = useForm({ title: "", due_date: "" });
    const completedTasks = tasks.filter((task) => task.completed).length;
    const openTasks = tasks.length - completedTasks;
    const completion = tasks.length
        ? Math.round((completedTasks / tasks.length) * 100)
        : 0;

    const submit = (event) => {
        event.preventDefault();
        form.post("/admin/tasks", {
            preserveScroll: true,
            onSuccess: () => {
                document.activeElement?.blur();
                form.reset();
                setAdding(false);
            },
        });
    };

    const toggleTask = (task) => {
        router.patch(
            `/admin/tasks/${task.id}`,
            { completed: !task.completed },
            { preserveScroll: true },
        );
    };

    const deleteTask = () => {
        if (!deleteTarget || deleting) return;
        router.delete(`/admin/tasks/${deleteTarget.id}`, {
            preserveScroll: true,
            onStart: () => setDeleting(true),
            onSuccess: () => setDeleteTarget(null),
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <><article className="admin-panel admin-todo-panel">
            <div className="admin-panel-heading">
                <div>
                    <h2>
                        <ListChecks aria-hidden="true" />
                        {filipino ? "Listahan ng gagawin" : "To-do list"}
                    </h2>
                    <p>
                        {filipino
                            ? "Mga gawain na ginawa ng CENRO administrator"
                            : "Tasks created by the CENRO administrator"}
                    </p>
                </div>
                {!adding && (
                    <button
                        type="button"
                        className="admin-add-task"
                        onClick={() => setAdding(true)}
                    >
                        <Plus />
                        {filipino ? "Magdagdag" : "Add task"}
                    </button>
                )}
            </div>

            {tasks.length > 0 && (
                <div className="admin-task-progress">
                    <div>
                        <strong>
                            {openTasks}{" "}
                            {filipino
                                ? openTasks === 1
                                    ? "gawain ang kailangan"
                                    : "gawain ang kailangan"
                                : openTasks === 1
                                  ? "task"
                                  : "tasks"}{" "}
                            {filipino ? "tapusin" : "to complete"}
                        </strong>
                        <span>
                            {filipino
                                ? `${completedTasks} sa ${tasks.length} nakumpleto`
                                : `${completedTasks} of ${tasks.length} completed`}
                        </span>
                    </div>
                    <span
                        className="admin-task-progress-track"
                        role="progressbar"
                        aria-label={
                            filipino
                                ? "Pagkumpleto ng gawain"
                                : "Task completion"
                        }
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow={completion}
                    >
                        <i style={{ width: `${completion}%` }} />
                    </span>
                </div>
            )}

            {adding && (
                <form className="admin-task-form" onSubmit={submit}>
                    <label>
                        <span>{filipino ? "Gawain" : "Task"}</span>
                        <input
                            type="text"
                            value={form.data.title}
                            maxLength="120"
                            autoFocus
                            placeholder={
                                filipino
                                    ? "hal. Suriin ang mga tala ng nagbebenta sa Rosario"
                                    : "e.g. Review Rosario seller records"
                            }
                            onChange={(event) =>
                                form.setData("title", event.target.value)
                            }
                        />
                        {form.errors.title && (
                            <small role="alert">{form.errors.title}</small>
                        )}
                    </label>
                    <label>
                        <span>
                            {filipino ? "Petsang hangganan" : "Due date"}{" "}
                            <small>
                                {filipino ? "(opsyonal)" : "(optional)"}
                            </small>
                        </span>
                        <input
                            type="date"
                            value={form.data.due_date}
                            onChange={(event) =>
                                form.setData("due_date", event.target.value)
                            }
                        />
                        {form.errors.due_date && (
                            <small role="alert">{form.errors.due_date}</small>
                        )}
                    </label>
                    <div>
                        <button
                            type="button"
                            onClick={() => {
                                form.reset();
                                form.clearErrors();
                                setAdding(false);
                            }}
                        >
                            {filipino ? "Kanselahin" : "Cancel"}
                        </button>
                        <button type="submit" disabled={form.processing}>
                            {form.processing
                                ? filipino
                                    ? "Idinadagdag…"
                                    : "Adding…"
                                : filipino
                                  ? "Idagdag"
                                  : "Add task"}
                        </button>
                    </div>
                </form>
            )}

            {tasks.length ? (
                <div className="admin-todo-list">
                    {tasks.map((task) => (
                        <article
                            className={task.completed ? "is-complete" : ""}
                            key={task.id}
                        >
                            <button
                                type="button"
                                className="admin-task-check"
                                aria-label={`${task.completed ? (filipino ? "Buksan muli" : "Reopen") : filipino ? "Kumpletuhin" : "Complete"} ${task.title}`}
                                onClick={() => toggleTask(task)}
                            >
                                {task.completed && <Check />}
                            </button>
                            <span className="admin-task-copy">
                                <strong>{task.title}</strong>
                                <small>
                                    <CalendarClock aria-hidden="true" />
                                    {task.completed
                                        ? filipino
                                            ? "Nakumpleto"
                                            : "Completed"
                                        : task.dueDate
                                          ? filipino
                                              ? `Hanggang ${formatTaskDate(task.dueDate)}`
                                              : `Due ${formatTaskDate(task.dueDate)}`
                                          : filipino
                                            ? "Walang petsang hangganan"
                                            : "No due date"}
                                </small>
                            </span>
                            <button
                                type="button"
                                className="admin-task-delete"
                                aria-label={`Delete ${task.title}`}
                                onClick={() => setDeleteTarget(task)}
                            >
                                <Trash2 />
                            </button>
                        </article>
                    ))}
                </div>
            ) : (
                !adding && (
                    <div className="admin-empty admin-task-empty">
                        <EmptyIllustration icon={ListChecks} />
                        <strong>No tasks yet</strong>
                        <p>
                            Add reminders for seller reviews, reports, meetings,
                            or barangay follow-ups.
                        </p>
                    </div>
                )
            )}
        </article>
        <ConfirmationDialog open={Boolean(deleteTarget)} title={filipino ? 'Burahin ang gawain?' : 'Delete task?'} description={filipino ? `Aalisin ang “${deleteTarget?.title || ''}” sa iyong listahan ng gagawin.` : `“${deleteTarget?.title || ''}” will be removed from your to-do list.`} confirmLabel={filipino ? 'Burahin ang gawain' : 'Delete task'} cancelLabel={filipino ? 'Kanselahin' : 'Cancel'} workingLabel={filipino ? 'Binubura…' : 'Deleting…'} busy={deleting} onCancel={() => setDeleteTarget(null)} onConfirm={deleteTask} />
        </>
    );
}

function MonthlySalesChart({ data }) {
    const [activePoint, setActivePoint] = useState(null);
    const colors = [
        "#25814f",
        "#dda51c",
        "#2668a9",
        "#9b5cb5",
        "#d66b39",
        "#4f8d87",
    ];
    const values = data.series.flatMap((series) => series.sales.map(Number));
    const maximum = Math.max(...values, 1);
    const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(maximum)) - 1);
    const chartMaximum = Math.ceil(maximum / magnitude / 4) * magnitude * 4;
    const plot = { left: 68, right: 700, top: 22, bottom: 220 };
    const x = (index) =>
        plot.left +
        (index * (plot.right - plot.left)) /
            Math.max(data.months.length - 1, 1);
    const y = (value) =>
        plot.bottom - (Number(value) / chartMaximum) * (plot.bottom - plot.top);
    const gridValues = [
        chartMaximum,
        chartMaximum * 0.75,
        chartMaximum * 0.5,
        chartMaximum * 0.25,
        0,
    ];
    const tooltipWidth = 166;
    const tooltipHeight = 54;
    const tooltipX = activePoint
        ? Math.min(
              Math.max(activePoint.x - tooltipWidth / 2, 8),
              730 - tooltipWidth - 8,
          )
        : 0;
    const tooltipY = activePoint
        ? Math.max(activePoint.y - tooltipHeight - 14, 8)
        : 0;

    return (
        <div className="admin-line-chart">
            <div
                className="admin-chart-legend"
                aria-label="Barangay chart legend"
            >
                {data.series.map((series, index) => (
                    <span key={series.name}>
                        <i
                            style={{
                                backgroundColor: colors[index % colors.length],
                            }}
                        />
                        {series.name}
                    </span>
                ))}
            </div>
            <svg
                viewBox="0 0 730 260"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Six-month completed sales by barangay"
            >
                <title>Monthly completed sales for each partner barangay</title>
                {gridValues.map((value) => (
                    <g key={value}>
                        <line
                            x1={plot.left}
                            x2={plot.right}
                            y1={y(value)}
                            y2={y(value)}
                        />
                        <text
                            x={plot.left - 10}
                            y={y(value) + 4}
                            textAnchor="end"
                        >
                            {formatAxisCurrency(value)}
                        </text>
                    </g>
                ))}
                {data.series.map((series, index) => {
                    const points = series.sales
                        .map(
                            (sale, pointIndex) => `${x(pointIndex)},${y(sale)}`,
                        )
                        .join(" ");
                    const color = colors[index % colors.length];

                    return (
                        <g
                            key={series.name}
                            aria-label={`${series.name} monthly sales`}
                        >
                            <polyline
                                points={points}
                                style={{ stroke: color }}
                            />
                            {series.sales.map((sale, pointIndex) => (
                                <g
                                    key={`${series.name}-${data.months[pointIndex].key}`}
                                >
                                    <circle
                                        className="admin-chart-point"
                                        cx={x(pointIndex)}
                                        cy={y(sale)}
                                        r="4"
                                        style={{ fill: color }}
                                    />
                                    <circle
                                        className="admin-chart-hit-area"
                                        cx={x(pointIndex)}
                                        cy={y(sale)}
                                        r="14"
                                        tabIndex="0"
                                        role="button"
                                        aria-label={`${series.name}, ${data.months[pointIndex].label}: ${formatCurrency(sale)}`}
                                        onPointerEnter={() =>
                                            setActivePoint({
                                                series: series.name,
                                                month: data.months[pointIndex]
                                                    .label,
                                                sale: Number(sale),
                                                color,
                                                x: x(pointIndex),
                                                y: y(sale),
                                            })
                                        }
                                        onPointerLeave={() =>
                                            setActivePoint(null)
                                        }
                                        onFocus={() =>
                                            setActivePoint({
                                                series: series.name,
                                                month: data.months[pointIndex]
                                                    .label,
                                                sale: Number(sale),
                                                color,
                                                x: x(pointIndex),
                                                y: y(sale),
                                            })
                                        }
                                        onBlur={() => setActivePoint(null)}
                                    />
                                </g>
                            ))}
                        </g>
                    );
                })}
                {activePoint && (
                    <g
                        className="admin-chart-tooltip"
                        transform={`translate(${tooltipX} ${tooltipY})`}
                        aria-hidden="true"
                    >
                        <rect
                            width={tooltipWidth}
                            height={tooltipHeight}
                            rx="7"
                        />
                        <circle
                            cx="13"
                            cy="17"
                            r="4"
                            style={{ fill: activePoint.color }}
                        />
                        <text
                            className="admin-chart-tooltip-title"
                            x="23"
                            y="21"
                        >
                            {activePoint.series} · {activePoint.month}
                        </text>
                        <text
                            className="admin-chart-tooltip-value"
                            x="12"
                            y="42"
                        >
                            {formatCurrency(activePoint.sale)} completed sales
                        </text>
                    </g>
                )}
                {data.months.map((month, index) => (
                    <text
                        className="admin-chart-month"
                        key={month.key}
                        x={x(index)}
                        y="248"
                        textAnchor="middle"
                    >
                        {month.label}
                    </text>
                ))}
            </svg>
        </div>
    );
}

function SectionEmptyState({ section, filipino }) {
    const current = sections.find(({ label }) => label === section);
    const copy = emptyStateCopy[section];
    const Icon = current?.icon || PackageOpen;

    return (
        <>
            <h1 className="admin-page-title">
                {filipino && current?.labelFilipino
                    ? current.labelFilipino
                    : section}
            </h1>

            <section className="admin-panel admin-section-empty">
                <EmptyIllustration icon={Icon} />
                <strong>{filipino ? copy.titleFilipino : copy.title}</strong>
                <p>{filipino ? copy.detailFilipino : copy.detail}</p>
            </section>
        </>
    );
}

function EmptyIllustration({ icon: Icon }) {
    return (
        <span className="admin-empty-icon" aria-hidden="true">
            <Icon />
        </span>
    );
}

function getActivityIconConfig(activity) {
    if (activity.type === "order") {
        switch (activity.status) {
            case "delivered":
                return {
                    IconComponent: PackageCheck,
                    iconClass: "admin-activity-icon--order-delivered",
                };
            case "cancelled":
                return {
                    IconComponent: PackageX,
                    iconClass: "admin-activity-icon--order-cancelled",
                };
            case "out_for_delivery":
                return {
                    IconComponent: Truck,
                    iconClass: "admin-activity-icon--order-transit",
                };
            case "preparing":
                return {
                    IconComponent: Package,
                    iconClass: "admin-activity-icon--order-preparing",
                };
            default:
                return {
                    IconComponent: ShoppingBag,
                    iconClass: "admin-activity-icon--order",
                };
        }
    }

    if (activity.type === "seller") {
        return {
            IconComponent: UserCheck,
            iconClass: "admin-activity-icon--seller",
        };
    }

    const name = (activity.productName || activity.title || "").toLowerCase();
    const category = activity.category || "";

    if (
        category === "Fruits" ||
        /apple|strawberry|mango|banana|papaya|pineapple|berry|melon/.test(name)
    ) {
        return {
            IconComponent: Apple,
            iconClass: "admin-activity-icon--product-fruits",
        };
    }

    if (/lemon|orange|citrus|calamansi|lime/.test(name)) {
        return {
            IconComponent: Citrus,
            iconClass: "admin-activity-icon--product-fruits",
        };
    }

    if (/carrot|radish|turnip|root/.test(name)) {
        return {
            IconComponent: Carrot,
            iconClass: "admin-activity-icon--product-vegetables",
        };
    }

    if (
        /cabbage|kangkong|lettuce|pechay|spinach|greens|salad|bok choy|leaf/.test(
            name,
        )
    ) {
        return {
            IconComponent: Salad,
            iconClass: "admin-activity-icon--product-vegetables",
        };
    }

    if (
        category === "Herbs" ||
        /basil|oregano|mint|thyme|rosemary|parsley|cilantro/.test(name)
    ) {
        return {
            IconComponent: Leaf,
            iconClass: "admin-activity-icon--product-herbs",
        };
    }

    if (
        category === "Beans" ||
        /bean|sitaw|mongo|pea|legume|grain|wheat|corn|rice/.test(name)
    ) {
        return {
            IconComponent: Wheat,
            iconClass: "admin-activity-icon--product-beans",
        };
    }

    if (category === "Vegetables") {
        return {
            IconComponent: Salad,
            iconClass: "admin-activity-icon--product-vegetables",
        };
    }

    return { IconComponent: Sprout, iconClass: "admin-activity-icon--product" };
}

function ActivityThumbnail({ activity }) {
    const [imageError, setImageError] = useState(false);
    const hasImage = Boolean(activity.image) && !imageError;
    const { IconComponent, iconClass } = getActivityIconConfig(activity);

    if (hasImage) {
        return (
            <span
                className={`admin-activity-icon admin-activity-icon--has-image admin-activity-icon--${activity.type}`}
            >
                <img
                    src={activity.image}
                    alt=""
                    className="admin-activity-img"
                    onError={() => setImageError(true)}
                    loading="lazy"
                />
                {activity.type === "order" &&
                    activity.status === "delivered" && (
                        <span
                            className="admin-activity-badge admin-activity-badge--delivered"
                            title="Delivered"
                            aria-hidden="true"
                        >
                            <Check />
                        </span>
                    )}
                {activity.type === "order" &&
                    activity.status === "cancelled" && (
                        <span
                            className="admin-activity-badge admin-activity-badge--cancelled"
                            title="Cancelled"
                            aria-hidden="true"
                        >
                            <X />
                        </span>
                    )}
                {activity.type === "order" &&
                    activity.status === "out_for_delivery" && (
                        <span
                            className="admin-activity-badge admin-activity-badge--transit"
                            title="Out for delivery"
                            aria-hidden="true"
                        >
                            <Truck />
                        </span>
                    )}
                {activity.type === "order" &&
                    activity.status === "preparing" && (
                        <span
                            className="admin-activity-badge admin-activity-badge--preparing"
                            title="Preparing"
                            aria-hidden="true"
                        >
                            <Package />
                        </span>
                    )}
            </span>
        );
    }

    return (
        <span className={`admin-activity-icon ${iconClass}`}>
            <IconComponent aria-hidden="true" />
        </span>
    );
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
}

function formatNumber(value) {
    return new Intl.NumberFormat("en-PH").format(Number(value) || 0);
}

function formatAxisCurrency(value) {
    if (Number(value) >= 1000000)
        return `₱${(Number(value) / 1000000).toFixed(Number(value) % 1000000 ? 1 : 0)}M`;
    if (Number(value) >= 1000)
        return `₱${(Number(value) / 1000).toFixed(Number(value) % 1000 ? 1 : 0)}K`;
    return `₱${Math.round(Number(value))}`;
}

function formatTaskDate(value) {
    return new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Asia/Manila",
    }).format(new Date(`${value}T00:00:00+08:00`));
}

function formatRelativeTime(value) {
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return "Recently";

    const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;

    return new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
    }).format(new Date(timestamp));
}
