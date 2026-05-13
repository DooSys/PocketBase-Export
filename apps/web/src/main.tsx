import {
  Database,
  Download,
  FileArchive,
  Github,
  Globe2,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
  Moon,
  Rows3,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Sun
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  downloadExport,
  fetchCollections,
  fetchCollectionStats,
  login,
  type AuthMode,
  type Collection,
  type CollectionStats,
  type ExportOptions
} from "./api";
import "./styles.css";

type Language = "fr" | "en";
type Theme = "light" | "dark";

const storedPbUrlKey = "pb-api-export-url";
const storedAuthCollectionKey = "pb-api-export-auth-collection";
const storedAuthModeKey = "pb-api-export-auth-mode";
const storedExportCollectionKey = "pb-api-export-collection";
const storedHistoryKey = "pb-api-export-history";
const storedLanguageKey = "pb-api-export-language";
const storedThemeKey = "pb-api-export-theme";

const translations = {
  en: {
    apiUser: "API user",
    advancedOptions: "Advanced options",
    authCollection: "API auth collection",
    collectionFallback: "Collection listing is unavailable for this API user. Enter the collection name manually.",
    collectionSearch: "Search collections",
    collectionSession: "Collection",
    collectionToExport: "Collection to export",
    columns: "Columns",
    compressZip: "Compress as ZIP",
    collections: "Collections",
    connected: "Connected",
    dark: "Dark",
    disconnect: "Disconnect",
    export: "Export",
    exportCollectionPlaceholder: "Exact collection name",
    exportFailed: "Export failed.",
    exportReady: "Ready to export",
    exportStepBuild: "Build file",
    exportStepCompress: "Compression",
    exportStepDone: "Done",
    exportStepFetch: "Export",
    progressTitle: "Preparing export",
    progressSubtitle: "The file is being generated. Keep this tab open.",
    fields: "Fields",
    fieldsPlaceholder: "*,expand.author.name",
    filter: "PocketBase filter",
    filterPlaceholder: "created >= \"2026-01-01 00:00:00\"",
    footerText: "Open source companion app for PocketBase exports.",
    format: "Format",
    hideSystem: "Hide system",
    identity: "Identity",
    light: "Light",
    loadingCollection: "Loading",
    loadCollectionsFailed: "Unable to load collections.",
    login: "Sign in",
    loginFailed: "Unable to sign in.",
    mode: "Mode",
    notConnected: "Not connected",
    pageSize: "Page size",
    password: "Password",
    pbUrl: "PocketBase URL",
    refresh: "Refresh",
    relations: "Expand relations",
    relationsPlaceholder: "author,category",
    session: "Session",
    showSystem: "Show system",
    systemCollections: "System collections",
    subtitle: "PocketBase companion app for exporting collections through the API.",
    totalEntries: "Entries",
    updatedAt: "Last write",
    sort: "Sort",
    superuser: "PocketBase superuser",
    title: "PocketBase Export"
  },
  fr: {
    apiUser: "Utilisateur API",
    advancedOptions: "Options avancées",
    authCollection: "Collection auth API",
    collectionFallback: "Liste des collections indisponible avec cet utilisateur API. Saisis la collection à exporter manuellement.",
    collectionSearch: "Rechercher une collection",
    collectionSession: "Collection",
    collectionToExport: "Collection à exporter",
    columns: "Colonnes",
    compressZip: "Compresser en ZIP",
    collections: "Collections",
    connected: "Connecté",
    dark: "Sombre",
    disconnect: "Déconnecter",
    export: "Exporter",
    exportCollectionPlaceholder: "Nom exact de la collection",
    exportFailed: "Export impossible.",
    exportReady: "Prêt pour l'export",
    exportStepBuild: "Construction fichier",
    exportStepCompress: "Compression",
    exportStepDone: "Terminé",
    exportStepFetch: "Export",
    progressTitle: "Préparation de l'export",
    progressSubtitle: "Le fichier est en cours de génération. Garde cet onglet ouvert.",
    fields: "Champs",
    fieldsPlaceholder: "*,expand.auteur.nom",
    filter: "Filtre PocketBase",
    filterPlaceholder: "created >= \"2026-01-01 00:00:00\"",
    footerText: "Application compagnon open source pour les exports PocketBase.",
    format: "Format",
    hideSystem: "Masquer système",
    identity: "Identifiant",
    light: "Clair",
    loadingCollection: "Chargement",
    loadCollectionsFailed: "Impossible de charger les collections.",
    login: "Se connecter",
    loginFailed: "Connexion impossible.",
    mode: "Mode",
    notConnected: "Non connecté",
    pageSize: "Taille page",
    password: "Mot de passe",
    pbUrl: "URL PocketBase",
    refresh: "Rafraîchir",
    relations: "Relations expand",
    relationsPlaceholder: "auteur,catégorie",
    session: "Session",
    showSystem: "Afficher système",
    systemCollections: "Collections système",
    subtitle: "Application compagnon PocketBase pour exporter les collections via API.",
    totalEntries: "Entrées",
    updatedAt: "Dernière écriture",
    sort: "Tri",
    superuser: "Superuser PocketBase",
    title: "PocketBase Export"
  }
} satisfies Record<Language, Record<string, string>>;

const githubUrl = "https://github.com/DooSys/PocketBase-API-Export";

type InputHistory = {
  authCollections: string[];
  exportCollections: string[];
  pbUrls: string[];
};

const emptyHistory: InputHistory = {
  authCollections: [],
  exportCollections: [],
  pbUrls: []
};

function detectLanguage(): Language {
  return navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function readStoredLanguage(): Language {
  const value = localStorage.getItem(storedLanguageKey);
  return value === "fr" || value === "en" ? value : detectLanguage();
}

function readStoredTheme(): Theme {
  const value = localStorage.getItem(storedThemeKey);
  return value === "dark" || value === "light" ? value : "light";
}

function readStoredAuthMode(): AuthMode {
  const value = localStorage.getItem(storedAuthModeKey);
  return value === "apiUser" || value === "superuser" ? value : "superuser";
}

function App() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [authCollection, setAuthCollection] = useState(() => localStorage.getItem(storedAuthCollectionKey) ?? "User_API");
  const [authMode, setAuthMode] = useState<AuthMode>(readStoredAuthMode);
  const [collectionSearch, setCollectionSearch] = useState("");
  const [exportCollection, setExportCollection] = useState(() => localStorage.getItem(storedExportCollectionKey) ?? "");
  const [error, setError] = useState("");
  const [identity, setIdentity] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [exportStep, setExportStep] = useState(0);
  const [history, setHistory] = useState<InputHistory>(readHistory);
  const [language, setLanguage] = useState<Language>(readStoredLanguage);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pbUrl, setPbUrl] = useState(() => localStorage.getItem(storedPbUrlKey) ?? "http://127.0.0.1:8090");
  const [showSystemCollections, setShowSystemCollections] = useState(false);
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [token, setToken] = useState("");
  const [options, setOptions] = useState<ExportOptions>({
    collection: "",
    expand: "",
    fields: "",
    filter: "",
    format: "csv",
    perPage: 200,
    sort: "",
    zip: false
  });

  const selectedCollection = useMemo(
    () => collections.find((collection) => collection.name === options.collection),
    [collections, options.collection]
  );
  const t = translations[language];
  const visibleCollections = useMemo(() => {
    const search = collectionSearch.trim().toLowerCase();

    return collections.filter((collection) => {
      if (!showSystemCollections && collection.system) {
        return false;
      }

      return !search || collection.name.toLowerCase().includes(search) || collection.type.toLowerCase().includes(search);
    });
  }, [collectionSearch, collections, showSystemCollections]);
  const hasSystemCollections = collections.some((collection) => collection.system);
  const activeModeLabel = authMode === "superuser" ? t.superuser : t.apiUser;
  const progressLabels = [t.exportStepFetch, t.exportStepBuild, t.exportStepCompress, t.exportStepDone];
  const progressPercent = Math.max(8, Math.min((exportStep / progressLabels.length) * 100, 100));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(storedThemeKey, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(storedLanguageKey, language);
  }, [language]);

  useEffect(() => {
    if (!token) {
      return;
    }

    if (authMode === "apiUser") {
      setCollections([]);
      return;
    }

    void loadCollections(token, pbUrl);
  }, [authMode, pbUrl, token]);

  useEffect(() => {
    if (!token || !options.collection) {
      setCollectionStats(null);
      setIsStatsLoading(false);
      return;
    }

    setCollectionStats(null);
    setIsStatsLoading(true);
    void loadCollectionStats(options.collection);
  }, [options.collection, pbUrl, token]);

  async function loadCollections(authToken = token, targetPbUrl = pbUrl) {
    setIsBusy(true);
    setError("");

    try {
      const data = await fetchCollections(authToken, targetPbUrl);
      setCollections(data);
      setOptions((current) => ({
        ...current,
        collection: current.collection || data.find((collection) => !collection.system)?.name || data[0]?.name || ""
      }));
    } catch (collectionError) {
      setCollections([]);
      setError(
        authMode === "apiUser"
          ? t.collectionFallback
          : collectionError instanceof Error
            ? collectionError.message
            : t.loadCollectionsFailed
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setError("");

    try {
      const auth = await login(pbUrl, authMode, authCollection, identity, password);
      localStorage.setItem(storedAuthCollectionKey, auth.authCollection);
      localStorage.setItem(storedAuthModeKey, auth.authMode);
      localStorage.setItem(storedExportCollectionKey, exportCollection);
      localStorage.setItem(storedPbUrlKey, auth.pbUrl);
      saveHistory({
        authCollections: auth.authCollection ? [auth.authCollection] : [],
        exportCollections: exportCollection ? [exportCollection] : [],
        pbUrls: auth.pbUrl ? [auth.pbUrl] : []
      });
      setAuthCollection(auth.authCollection);
      setAuthMode(auth.authMode);
      setPbUrl(auth.pbUrl);
      setToken(auth.token);
      setOptions((current) => ({
        ...current,
        collection: auth.authMode === "apiUser" ? exportCollection : current.collection
      }));
      setPassword("");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : t.loginFailed);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleExport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!options.collection || !token) {
      return;
    }

    setIsBusy(true);
    setError("");
    setExportStep(1);

    try {
      setExportStep(2);
      await downloadExport(token, pbUrl, options);

      if (options.zip) {
        setExportStep(3);
        await wait(300);
      }

      setExportStep(4);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : t.exportFailed);
    } finally {
      setIsBusy(false);
    }
  }

  async function loadCollectionStats(collection: string) {
    try {
      const stats = await fetchCollectionStats(token, pbUrl, collection);
      setCollectionStats(stats);
    } catch {
      setCollectionStats(null);
    } finally {
      setIsStatsLoading(false);
    }
  }

  function selectCollection(collectionName: string) {
    setCollectionStats(null);
    setIsStatsLoading(true);
    setExportStep(0);
    setOptions((current) => ({ ...current, collection: collectionName }));
  }

  function saveHistory(next: Partial<InputHistory>) {
    setHistory((current) => {
      const merged = mergeHistory(current, next);
      localStorage.setItem(storedHistoryKey, JSON.stringify(merged));
      return merged;
    });
  }

  function disconnect() {
    localStorage.removeItem(storedAuthCollectionKey);
    localStorage.removeItem(storedAuthModeKey);
    localStorage.removeItem(storedExportCollectionKey);
    localStorage.removeItem(storedPbUrlKey);
    setToken("");
    setCollections([]);
    setOptions((current) => ({ ...current, collection: "" }));
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div className="brandBlock">
          <img className="logoSlot" alt="PocketBase Export logo" src="/pocketbase-export-logo.png" />
          <div>
            <h1>{t.title}</h1>
            <p className="subtitle">{t.subtitle}</p>
          </div>
        </div>
        <div className="topbarActions">
          <div className="switchGroup" aria-label="Language">
            <span className="switchIcon">
              <Languages size={16} />
            </span>
            <button className={language === "fr" ? "active" : ""} onClick={() => setLanguage("fr")} type="button">
              FR
            </button>
            <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")} type="button">
              EN
            </button>
          </div>
          <div className="switchGroup" aria-label="Theme">
            <button
              aria-label={t.light}
              className={theme === "light" ? "iconChoice active" : "iconChoice"}
              onClick={() => setTheme("light")}
              title={t.light}
              type="button"
            >
              <Sun size={16} />
            </button>
            <button
              aria-label={t.dark}
              className={theme === "dark" ? "iconChoice active" : "iconChoice"}
              onClick={() => setTheme("dark")}
              title={t.dark}
              type="button"
            >
              <Moon size={16} />
            </button>
          </div>
          <div className="status">
            <span className={token ? "dot dotReady" : "dot"} />
            {token ? t.connected : t.notConnected}
          </div>
        </div>
      </section>

      {!token ? (
        <form className="panel authPanel" onSubmit={handleLogin}>
          <div className="panelHeader">
            <KeyRound size={20} />
            <h2>{t.login}</h2>
          </div>
          <label>
            {t.pbUrl}
            <input
              list="pb-url-history"
              autoComplete="url"
              onChange={(event) => setPbUrl(event.target.value)}
              placeholder="http://127.0.0.1:8090"
              required
              type="url"
              value={pbUrl}
            />
            <datalist id="pb-url-history">
              {history.pbUrls.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </label>
          <label>
            {t.mode}
            <select onChange={(event) => setAuthMode(event.target.value as AuthMode)} value={authMode}>
              <option value="superuser">{t.superuser}</option>
              <option value="apiUser">{t.apiUser}</option>
            </select>
          </label>
          {authMode === "apiUser" ? (
            <>
              <label>
                {t.authCollection}
                <input
                  list="auth-collection-history"
                  onChange={(event) => setAuthCollection(event.target.value)}
                  placeholder="User_API"
                  required
                  value={authCollection}
                />
                <datalist id="auth-collection-history">
                  {history.authCollections.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </label>
              <label>
                {t.collectionToExport}
                <input
                  list="export-collection-history"
                  onChange={(event) => setExportCollection(event.target.value)}
                  placeholder={t.exportCollectionPlaceholder}
                  required
                  value={exportCollection}
                />
                <datalist id="export-collection-history">
                  {history.exportCollections.map((value) => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </label>
            </>
          ) : null}
          <label>
            {t.identity}
            <input
              autoComplete="username"
              onChange={(event) => setIdentity(event.target.value)}
              required
              value={identity}
            />
          </label>
          <label>
            {t.password}
            <span className="passwordField">
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                onClick={() => setShowPassword((current) => !current)}
                type="button"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <button className="primaryButton" disabled={isBusy} type="submit">
            <KeyRound size={18} />
            {t.login}
          </button>
        </form>
      ) : (
        <section className="workspace">
          <aside className="collections">
            <div className="panelHeader spread">
              <h2>{t.collections}</h2>
              <div className="sidebarTools">
                {authMode !== "apiUser" ? (
                  <button aria-label={t.refresh} className="iconButton" disabled={isBusy} onClick={() => void loadCollections()} type="button">
                    <RefreshCw size={18} />
                  </button>
                ) : null}
              </div>
            </div>
            {authMode === "apiUser" ? (
              <label>
                {t.collectionToExport}
                <input
                  onChange={(event) => {
                    setExportCollection(event.target.value);
                    selectCollection(event.target.value);
                  }}
                  placeholder={t.exportCollectionPlaceholder}
                  value={options.collection}
                />
              </label>
            ) : (
              <>
                <label className="searchField">
                  <Search size={17} />
                  <input
                    aria-label={t.collectionSearch}
                    onChange={(event) => setCollectionSearch(event.target.value)}
                    placeholder={t.collectionSearch}
                    value={collectionSearch}
                  />
                </label>
                <div className="collectionList">
                  {visibleCollections.map((collection) => (
                    <button
                      className={collection.name === options.collection ? "collectionItem selected" : "collectionItem"}
                      key={collection.id}
                      onClick={() => selectCollection(collection.name)}
                      type="button"
                    >
                      <span>{collection.name}</span>
                      <small>{collection.type}</small>
                    </button>
                  ))}
                </div>
              </>
            )}
            {authMode !== "apiUser" && hasSystemCollections ? (
              <label className="miniSwitch sidebarSwitch">
                <input
                  checked={showSystemCollections}
                  onChange={(event) => setShowSystemCollections(event.target.checked)}
                  type="checkbox"
                />
                <span />
                {t.systemCollections}
              </label>
            ) : null}
            <button className="ghostButton" onClick={disconnect} type="button">
              {t.disconnect}
            </button>
          </aside>

          <form className="panel exportPanel" onSubmit={handleExport}>
            <div className="exportHeader">
              <div>
                <div className="panelHeader">
                  <Download size={20} />
                  <h2>{t.export}</h2>
                </div>
                <p className="mutedLine">{t.exportReady}</p>
              </div>
              <div className="headerBadges">
                {isStatsLoading ? (
                  <span className="loadingPill">
                    <span className="spinner" />
                    {t.loadingCollection}
                  </span>
                ) : null}
                {selectedCollection ? <span className="typeBadge">{selectedCollection.type}</span> : null}
              </div>
            </div>

            <div className="sessionStrip">
              <div>
                <Globe2 size={16} />
                <span className="sessionLabel">{t.pbUrl}</span>
                <span className="sessionValue">{pbUrl}</span>
              </div>
              <div>
                <span className="sessionIcon">
                  {authMode === "superuser" ? <Shield size={16} /> : <KeyRound size={16} />}
                </span>
                <span className="sessionLabel">{t.mode}</span>
                <span className="sessionValue">{activeModeLabel}</span>
              </div>
              <div>
                <Rows3 size={16} />
                <span className="sessionLabel">{t.collectionSession}</span>
                <span className="sessionValue">{options.collection || "-"}</span>
              </div>
            </div>

            <div className="statGrid">
              <div className="statTile">
                <span>{t.totalEntries}</span>
                <strong>{isStatsLoading ? "-" : formatNumber(collectionStats?.totalItems)}</strong>
              </div>
              <div className="statTile">
                <span>{t.columns}</span>
                <strong>{formatNumber(selectedCollection?.columns)}</strong>
              </div>
              <div className="statTile">
                <span>{t.updatedAt}</span>
                <strong>{isStatsLoading ? "-" : formatDate(collectionStats?.lastUpdated, language)}</strong>
              </div>
            </div>

            <div className="formatRow">
              <label>
                {t.format}
                <select
                  onChange={(event) => setOptions((current) => ({ ...current, format: event.target.value as ExportOptions["format"] }))}
                  value={options.format}
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                  <option value="xlsx">XLSX</option>
                </select>
              </label>
              <label className="checkboxCard">
                <input
                  checked={options.zip}
                  onChange={(event) => setOptions((current) => ({ ...current, zip: event.target.checked }))}
                  type="checkbox"
                />
                <span>
                  <FileArchive size={18} />
                  {t.compressZip}
                </span>
              </label>
            </div>

            {isBusy ? (
              <div className="progressCard" aria-live="polite">
                <div className="progressHeader">
                  <span className="thinkingSpinner" />
                  <div>
                    <strong>{t.progressTitle}</strong>
                    <p>{t.progressSubtitle}</p>
                  </div>
                </div>
                <div className="progressTrack">
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="progressSteps">
                  {progressLabels.map((label, index) => (
                    <div
                      className={exportStep >= index + 1 ? "progressStep active" : "progressStep"}
                      key={label}
                    >
                      <span>{index + 1}</span>
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <details className="advancedPanel">
              <summary>
                <span>
                  <SlidersHorizontal size={17} />
                  {t.advancedOptions}
                </span>
              </summary>
              <div className="advancedContent">
                <div className="grid">
                  <label>
                    {t.pageSize}
                    <input
                      max={500}
                      min={1}
                      onChange={(event) => setOptions((current) => ({ ...current, perPage: Number(event.target.value) }))}
                      type="number"
                      value={options.perPage}
                    />
                  </label>
                  <label>
                    {t.sort}
                    <input
                      onChange={(event) => setOptions((current) => ({ ...current, sort: event.target.value }))}
                      placeholder="-created,id"
                      value={options.sort}
                    />
                  </label>
                </div>

                <label>
                  {t.filter}
                  <input
                    onChange={(event) => setOptions((current) => ({ ...current, filter: event.target.value }))}
                    placeholder={t.filterPlaceholder}
                    value={options.filter}
                  />
                </label>

                <div className="grid">
                  <label>
                    {t.fields}
                    <input
                      onChange={(event) => setOptions((current) => ({ ...current, fields: event.target.value }))}
                      placeholder={t.fieldsPlaceholder}
                      value={options.fields}
                    />
                  </label>
                  <label>
                    {t.relations}
                    <input
                      onChange={(event) => setOptions((current) => ({ ...current, expand: event.target.value }))}
                      placeholder={t.relationsPlaceholder}
                      value={options.expand}
                    />
                  </label>
                </div>
              </div>
            </details>

            <button className="primaryButton" disabled={isBusy || !options.collection} type="submit">
              <Download size={18} />
              {t.export}
            </button>
          </form>
        </section>
      )}

      {error ? <p className="error">{error}</p> : null}
      <footer className="footer">
        <span>{t.footerText}</span>
        <a href={githubUrl} rel="noreferrer" target="_blank">
          <Github size={17} />
          GitHub
        </a>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

function formatNumber(value: number | undefined): string {
  return typeof value === "number" ? new Intl.NumberFormat().format(value) : "-";
}

function formatDate(value: string | null | undefined, language: Language): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(language, {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function wait(duration: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function readHistory(): InputHistory {
  try {
    const value = JSON.parse(localStorage.getItem(storedHistoryKey) ?? "");
    return {
      authCollections: Array.isArray(value.authCollections) ? value.authCollections : [],
      exportCollections: Array.isArray(value.exportCollections) ? value.exportCollections : [],
      pbUrls: Array.isArray(value.pbUrls) ? value.pbUrls : []
    };
  } catch {
    return emptyHistory;
  }
}

function mergeHistory(current: InputHistory, next: Partial<InputHistory>): InputHistory {
  return {
    authCollections: mergeUnique(next.authCollections ?? [], current.authCollections),
    exportCollections: mergeUnique(next.exportCollections ?? [], current.exportCollections),
    pbUrls: mergeUnique(next.pbUrls ?? [], current.pbUrls)
  };
}

function mergeUnique(priority: string[], existing: string[]): string[] {
  return Array.from(new Set([...priority, ...existing].map((value) => value.trim()).filter(Boolean))).slice(0, 6);
}
