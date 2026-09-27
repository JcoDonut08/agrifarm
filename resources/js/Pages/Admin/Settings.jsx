import {
    BellRing,
    Boxes,
    Check,
    CloudRain,
    LayoutPanelTop,
    MapPinned,
    PackageSearch,
    Settings2,
    ShoppingBag,
    UsersRound,
} from "lucide-react";

import ThemeToggle from "../../Components/ThemeToggle";

const displayOptions = [
    {
        key: "showWeather",
        icon: CloudRain,
        english: [
            "Weather outlook",
            "Show the current Pasig weather and five-day forecast on the dashboard.",
        ],
        filipino: [
            "Taya ng panahon",
            "Ipakita ang kasalukuyang panahon sa Pasig at taya para sa susunod na limang araw sa dashboard.",
        ],
    },
    {
        key: "showRecentActivity",
        icon: LayoutPanelTop,
        english: [
            "Recent activity",
            "Show the latest partner seller, product, and order activity.",
        ],
        filipino: [
            "Mga bagong aktibidad",
            "Ipakita ang mga pinakabagong aktibidad ng mga partner seller, produkto, at order.",
        ],
    },
];

const notificationOptions = [
    {
        key: "sellerActivity",
        icon: UsersRound,
        english: [
            "Partner seller activity",
            "Alert me when recently added barangay seller accounts need monitoring.",
        ],
        filipino: [
            "Aktibidad ng partner seller",
            "Alerthuhan ako kapag kailangan i-monitor ang mga bagong dagdag na barangay seller accounts.",
        ],
    },
    {
        key: "orderAttention",
        icon: ShoppingBag,
        english: [
            "Orders needing attention",
            "Alert me when partner barangays have pending orders.",
        ],
        filipino: [
            "Mga order na kailangang asikasuhin",
            "Alerthuhan ako kapag may mga nakabinbing order ang mga partner na barangay.",
        ],
    },
    {
        key: "inventoryAlerts",
        icon: PackageSearch,
        english: [
            "Inventory alerts",
            "Alert me when products reach or fall below their stock threshold.",
        ],
        filipino: [
            "Mga alerto sa imbentaryo",
            "Alerthuhan ako kapag umabot na sa stock threshold ang mga produkto.",
        ],
    },
    {
        key: "weatherAlerts",
        icon: BellRing,
        english: [
            "Weather advisories",
            "Show important rain and storm updates for Pasig City.",
        ],
        filipino: [
            "Mga abiso sa panahon",
            "Ipakita ang mahahalagang update tungkol sa ulan at bagyo sa Pasig City.",
        ],
    },
];

export default function Settings({ preferences, onPreferenceChange }) {
    const filipino = preferences.language === "filipino";

    return (
        <>
            <h1 className="sr-only">{filipino ? "Mga Setting" : "Settings"}</h1>
            <section className="admin-panel admin-preferences">
                <header className="admin-preferences-header">
                    <span>
                        <Settings2 />
                    </span>
                    <div>
                        <h2>
                            {filipino
                                ? "Mga Setting ng Administrasyon"
                                : "Administration settings"}
                        </h2>
                        <p>
                            {filipino
                                ? "Iangkop ang hitsura ng Pasig CENRO workspace at kung ano ang ipapaalam nito sa iyo."
                                : "Personalize how the Pasig CENRO workspace looks and what it brings to your attention."}
                        </p>
                    </div>
                </header>

                <div className="admin-preference-group admin-appearance-settings">
                    <ThemeToggle
                        settings
                        systemOption
                        labels={
                            filipino
                                ? {
                                      title: "Hitsura",
                                      description:
                                          "Piliin ang maliwanag o madilim na workspace, o sundin ang setting ng device na ito.",
                                      light: "Maliwanag",
                                      dark: "Madilim",
                                      system: "Ayon sa system",
                                  }
                                : {
                                      title: "Appearance",
                                      description:
                                          "Choose a light or dark workspace, or follow this device’s system setting.",
                                  }
                        }
                    />
                </div>

                <fieldset className="admin-preference-group admin-language-settings">
                    <legend>{filipino ? "Wika" : "Language"}</legend>
                    <p>
                        {filipino
                            ? "Piliin ang wikang gagamitin sa admin workspace."
                            : "Choose the language used in the admin workspace."}
                    </p>
                    <div className="admin-language-options">
                        <button
                            type="button"
                            aria-pressed={preferences.language === "english"}
                            onClick={() =>
                                onPreferenceChange(
                                    "language",
                                    undefined,
                                    "english",
                                )
                            }
                        >
                            English
                        </button>
                        <button
                            type="button"
                            aria-pressed={preferences.language === "filipino"}
                            onClick={() =>
                                onPreferenceChange(
                                    "language",
                                    undefined,
                                    "filipino",
                                )
                            }
                        >
                            Filipino <small>Malinaw na Taglish</small>
                        </button>
                    </div>
                </fieldset>

                <PreferenceGroup
                    title={
                        filipino ? "Display sa dashboard" : "Dashboard display"
                    }
                    description={
                        filipino
                            ? "Piliin kung aling mga operational panel ang ipapakita sa iyong dashboard."
                            : "Choose which operational panels appear on your dashboard."
                    }
                    options={displayOptions}
                    values={preferences.display}
                    onChange={(key, enabled) =>
                        onPreferenceChange("display", key, enabled)
                    }
                    filipino={filipino}
                />

                <PreferenceGroup
                    title={filipino ? "Mga Notipikasyon" : "Notifications"}
                    description={
                        filipino
                            ? "Piliin kung aling CENRO monitoring alerts ang ipapakita sa ilalim ng notification bell."
                            : "Choose which CENRO monitoring alerts appear under the notification bell."
                    }
                    options={notificationOptions}
                    values={preferences.notifications}
                    onChange={(key, enabled) =>
                        onPreferenceChange("notifications", key, enabled)
                    }
                    filipino={filipino}
                />

                <section
                    className="admin-preference-group admin-region-settings"
                    aria-labelledby="admin-region-title"
                >
                    <div>
                        <h3 id="admin-region-title">
                            {filipino
                                ? "Konteksto ng administrasyon"
                                : "Administrative context"}
                        </h3>
                        <p>
                            {filipino
                                ? "Mga regional default na ginagamit kapag nagpapakita ng impormasyon sa dashboard."
                                : "Regional defaults used when presenting dashboard information."}
                        </p>
                    </div>
                    <dl>
                        <div>
                            <dt>
                                <MapPinned />
                                {filipino ? "Nasasakupan" : "Coverage area"}
                            </dt>
                            <dd>Pasig City</dd>
                        </div>
                        <div>
                            <dt>
                                <Boxes />
                                {filipino ? "Pera" : "Currency"}
                            </dt>
                            <dd>
                                {filipino
                                    ? "Philippine peso (PHP)"
                                    : "Philippine peso (PHP)"}
                            </dd>
                        </div>
                        <div>
                            <dt>
                                <LayoutPanelTop />
                                {filipino ? "Time zone" : "Time zone"}
                            </dt>
                            <dd>Philippine Time (UTC+8)</dd>
                        </div>
                    </dl>
                </section>

                <p className="admin-preferences-note">
                    <Check />
                    {filipino
                        ? "Awtomatikong nase-save ang mga pagbabago sa device na ito."
                        : "Changes are saved automatically on this device."}
                </p>
            </section>
        </>
    );
}

function PreferenceGroup({
    title,
    description,
    options,
    values,
    onChange,
    filipino,
}) {
    return (
        <fieldset className="admin-preference-group">
            <legend>{title}</legend>
            <p>{description}</p>
            <div className="admin-preference-options">
                {options.map(
                    ({ key, icon: Icon, english, filipino: filipinoText }) => {
                        const [optionTitle, optionDescription] = filipino
                            ? filipinoText
                            : english;
                        return (
                            <div className="admin-preference-option" key={key}>
                                <span>
                                    <Icon />
                                </span>
                                <div>
                                    <strong>{optionTitle}</strong>
                                    <small>{optionDescription}</small>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-label={optionTitle}
                                    aria-checked={values[key]}
                                    onClick={() => onChange(key, !values[key])}
                                >
                                    <span />
                                </button>
                            </div>
                        );
                    },
                )}
            </div>
        </fieldset>
    );
}
