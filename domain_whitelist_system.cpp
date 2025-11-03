/*
 * DOMAIN WHITELIST SYSTEM
 * Complete implementation for managing domain whitelisting in web browser
 * 
 * This system provides:
 * - API-controlled admin whitelist (highest priority)
 * - Local whitelist configuration
 * - Wildcard pattern matching
 * - URL request interception
 * - Integration with authentication system
 * 
 * Author: Extracted from Sejati.io project
 * Dependencies: Qt5/Qt6 with WebEngine module
 */

#include <QJsonObject>
#include <QJsonArray>
#include <QJsonValue>
#include <QDebug>
#include <QWebEngineUrlRequestInterceptor>
#include <QWebEngineUrlRequestInfo>
#include <QUrl>
#include <QStringList>

//==============================================================================
// CONFIG MANAGER - WHITELIST MANAGEMENT
//==============================================================================

class ConfigManager {
private:
    QJsonObject m_config;
    QString m_currentUser;
    QString m_currentUserRole;
    bool m_apiConfigLoaded = false;

public:
    // Core whitelist methods
    bool isDomainAllowed(const QString& domain) const;
    QStringList getWhitelistedDomains() const;
    
    // Admin-controlled whitelisting methods (API-controlled)
    bool addWhitelistedDomain(const QString& domain);
    bool removeWhitelistedDomain(const QString& domain);
    QStringList getAdminWhitelistedDomains() const;
    bool isDomainAdminWhitelisted(const QString& domain) const;
    void clearWhitelistedDomains();
    
    // Pattern matching
    bool matchesDomainPattern(const QString& domain, const QString& pattern) const;

private:
    QStringList getStringList(const QString& section, const QString& key) const {
        if (!m_config.contains(section)) return QStringList();
        
        QJsonArray array = m_config[section].toObject()[key].toArray();
        QStringList result;
        
        for (const QJsonValue& value : array) {
            result.append(value.toString());
        }
        
        return result;
    }
    
    void saveConfigAndSync() {
        // Implementation would save to config.json and sync to API
        qDebug() << "ConfigManager: Saving configuration and syncing to API";
    }
};

bool ConfigManager::matchesDomainPattern(const QString& domain, const QString& pattern) const {
    // Normalize both domain and pattern to lowercase for case-insensitive matching
    QString normalizedDomain = domain.toLower();
    QString normalizedPattern = pattern.toLower();
    
    // Handle universal wildcard
    if (normalizedPattern == "*") {
        return true;
    }
    
    // Handle wildcard patterns with * on both sides FIRST (most specific)
    if (normalizedPattern.startsWith("*") && normalizedPattern.endsWith("*")) {
        QString middle = normalizedPattern.mid(1, normalizedPattern.length() - 2); // Remove "*" from both sides
        if (middle.isEmpty()) {
            return true; // "*" matches everything
        }
        return normalizedDomain.contains(middle);
    }
    
    // Handle traditional wildcard patterns (for backward compatibility)
    if (normalizedPattern.startsWith("*.")) {
        QString baseDomain = normalizedPattern.mid(2); // Remove "*."
        return normalizedDomain == baseDomain || normalizedDomain.endsWith("." + baseDomain);
    }
    
    // Handle loose wildcard patterns like *.google.*
    if (normalizedPattern.startsWith("*.") && normalizedPattern.endsWith(".*")) {
        QString baseDomain = normalizedPattern.mid(2, normalizedPattern.length() - 4); // Remove "*." and ".*"
        return normalizedDomain.contains(baseDomain);
    }
    
    // Handle wildcard patterns starting with * (but not ending with *)
    if (normalizedPattern.startsWith("*")) {
        QString suffix = normalizedPattern.mid(1); // Remove "*"
        if (suffix.isEmpty()) {
            return true; // "*" matches everything
        }
        return normalizedDomain.endsWith(suffix);
    }
    
    // Handle wildcard patterns ending with * (but not starting with *)
    if (normalizedPattern.endsWith("*")) {
        QString prefix = normalizedPattern.left(normalizedPattern.length() - 1); // Remove "*"
        if (prefix.isEmpty()) {
            return true; // "*" matches everything
        }
        return normalizedDomain.startsWith(prefix);
    }
    
    // Exact match
    return normalizedDomain == normalizedPattern;
}

bool ConfigManager::isDomainAllowed(const QString& domain) const {
    if (domain.isEmpty()) {
        return false;
    }
    
    // Normalize domain for consistent matching
    QString normalizedDomain = domain.toLower().trimmed();
    
    // Get all domain lists
    QStringList whitelistedDomains = getWhitelistedDomains();
    QStringList adminWhitelistedDomains = getAdminWhitelistedDomains();
    
    qDebug() << "=== DOMAIN CHECK FOR:" << normalizedDomain << "===";
    qDebug() << "API config loaded:" << m_apiConfigLoaded;
    qDebug() << "Whitelisted domains:" << whitelistedDomains;
    qDebug() << "Admin whitelisted domains:" << adminWhitelistedDomains;
    
    // If API config is loaded, prioritize admin whitelist (API-controlled)
    if (m_apiConfigLoaded && !adminWhitelistedDomains.isEmpty()) {
        // Check if admin whitelisted (API-controlled, highest priority)
        for (const QString& whitelistedPattern : adminWhitelistedDomains) {
            if (matchesDomainPattern(normalizedDomain, whitelistedPattern)) {
                qDebug() << "Domain" << normalizedDomain << "ALLOWED by API admin whitelist pattern:" << whitelistedPattern;
                return true;
            }
        }
        
        // If API config is loaded and domain is not in admin whitelist, block it
        qDebug() << "Domain" << normalizedDomain << "BLOCKED - not in API admin whitelist";
        qDebug() << "=== END DOMAIN CHECK ===";
        return false;
    }
    
    // Fallback to local config logic when API config is not loaded
    // Check if admin whitelisted (these are always allowed, highest priority)
    for (const QString& whitelistedPattern : adminWhitelistedDomains) {
        if (matchesDomainPattern(normalizedDomain, whitelistedPattern)) {
            qDebug() << "Domain" << normalizedDomain << "ALLOWED by admin whitelist pattern:" << whitelistedPattern;
            return true;
        }
    }
    
    // Check if whitelisted (these are always allowed)
    for (const QString& whitelistedPattern : whitelistedDomains) {
        if (matchesDomainPattern(normalizedDomain, whitelistedPattern)) {
            qDebug() << "Domain" << normalizedDomain << "ALLOWED by whitelist pattern:" << whitelistedPattern;
            return true;
        }
    }
    
    // Domain is not in any whitelist
    qDebug() << "Domain" << normalizedDomain << "BLOCKED - not in any whitelist";
    qDebug() << "=== END DOMAIN CHECK ===";
    return false;
}

QStringList ConfigManager::getWhitelistedDomains() const {
    return getStringList("security", "whitelisted_domains");
}

bool ConfigManager::addWhitelistedDomain(const QString& domain) {
    if (domain.isEmpty()) {
        return false;
    }
    
    QJsonObject securitySection = m_config["security"].toObject();
    QJsonArray adminWhitelistedDomains = securitySection["admin_whitelisted_domains"].toArray();
    
    // Check if domain already exists
    for (const QJsonValue& value : adminWhitelistedDomains) {
        if (value.toString() == domain) {
            qDebug() << "ConfigManager: Domain" << domain << "already in admin whitelist";
            return true;
        }
    }
    
    // Add the domain
    adminWhitelistedDomains.append(domain);
    securitySection["admin_whitelisted_domains"] = adminWhitelistedDomains;
    m_config["security"] = securitySection;
    
    qDebug() << "ConfigManager: Added domain" << domain << "to admin whitelist";
    
    // Save locally and sync to API
    saveConfigAndSync();
    
    return true;
}

bool ConfigManager::removeWhitelistedDomain(const QString& domain) {
    if (domain.isEmpty()) {
        return false;
    }
    
    QJsonObject securitySection = m_config["security"].toObject();
    QJsonArray adminWhitelistedDomains = securitySection["admin_whitelisted_domains"].toArray();
    QJsonArray newWhitelistedDomains;
    
    bool found = false;
    for (const QJsonValue& value : adminWhitelistedDomains) {
        if (value.toString() != domain) {
            newWhitelistedDomains.append(value);
        } else {
            found = true;
        }
    }
    
    if (!found) {
        qDebug() << "ConfigManager: Domain" << domain << "not found in admin whitelist";
        return false;
    }
    
    securitySection["admin_whitelisted_domains"] = newWhitelistedDomains;
    m_config["security"] = securitySection;
    
    qDebug() << "ConfigManager: Removed domain" << domain << "from admin whitelist";
    
    // Save locally and sync to API
    saveConfigAndSync();
    
    return true;
}

QStringList ConfigManager::getAdminWhitelistedDomains() const {
    QStringList domains = getStringList("security", "admin_whitelisted_domains");
    if (domains.isEmpty()) {
        qDebug() << "ConfigManager: Admin whitelisted domains is empty (controlled by API)";
    } else {
        qDebug() << "ConfigManager: Admin whitelized domains from API:" << domains.size() << "entries";
    }
    return domains;
}

bool ConfigManager::isDomainAdminWhitelisted(const QString& domain) const {
    QStringList adminWhitelist = getAdminWhitelistedDomains();
    
    for (const QString& whitelistedPattern : adminWhitelist) {
        if (matchesDomainPattern(domain, whitelistedPattern)) {
            return true;
        }
    }
    
    return false;
}

void ConfigManager::clearWhitelistedDomains() {
    qDebug() << "ConfigManager: Clearing all whitelisted domains";
    
    QJsonObject securitySection = m_config["security"].toObject();
    
    // Clear admin whitelisted domains
    if (securitySection.contains("admin_whitelisted_domains")) {
        securitySection.remove("admin_whitelisted_domains");
        qDebug() << "Cleared admin_whitelisted_domains";
    }
    
    // Clear regular whitelisted domains
    if (securitySection.contains("whitelisted_domains")) {
        securitySection.remove("whitelisted_domains");
        qDebug() << "Cleared whitelisted_domains";
    }
    
    m_config["security"] = securitySection;
    
    // Save and sync
    saveConfigAndSync();
    
    qDebug() << "ConfigManager: All whitelisted domains cleared";
}

//==============================================================================
// DOMAIN INTERCEPTOR - URL REQUEST BLOCKING
//==============================================================================

class DomainInterceptor : public QWebEngineUrlRequestInterceptor {
public:
    DomainInterceptor(QObject *parent = nullptr) : QWebEngineUrlRequestInterceptor(parent) {}
    
    void interceptRequest(QWebEngineUrlRequestInfo &info) override;
    void setAllowedDomains(const QStringList &domains);

private:
    bool matchesDomainPattern(const QString& domain, const QString& pattern) const;
    QStringList whitelist;
};

void DomainInterceptor::setAllowedDomains(const QStringList &domains) {
    whitelist = domains;
    qDebug() << "DomainInterceptor: Updated allowed domains:" << domains.size() << "entries";
}

bool DomainInterceptor::matchesDomainPattern(const QString& domain, const QString& pattern) const {
    // Normalize both domain and pattern to lowercase for case-insensitive matching
    QString normalizedDomain = domain.toLower();
    QString normalizedPattern = pattern.toLower();
    
    // Handle universal wildcard
    if (normalizedPattern == "*") {
        return true;
    }
    
    // Handle wildcard patterns with * on both sides FIRST (most specific)
    if (normalizedPattern.startsWith("*") && normalizedPattern.endsWith("*")) {
        QString middle = normalizedPattern.mid(1, normalizedPattern.length() - 2); // Remove "*" from both sides
        if (middle.isEmpty()) {
            return true; // "*" matches everything
        }
        return normalizedDomain.contains(middle);
    }
    
    // Handle traditional wildcard patterns (for backward compatibility)
    if (normalizedPattern.startsWith("*.")) {
        QString baseDomain = normalizedPattern.mid(2); // Remove "*."
        return normalizedDomain == baseDomain || normalizedDomain.endsWith("." + baseDomain);
    }
    
    // Handle loose wildcard patterns like *.google.*
    if (normalizedPattern.startsWith("*.") && normalizedPattern.endsWith(".*")) {
        QString baseDomain = normalizedPattern.mid(2, normalizedPattern.length() - 4); // Remove "*." and ".*"
        return normalizedDomain.contains(baseDomain);
    }
    
    // Handle wildcard patterns starting with * (but not ending with *)
    if (normalizedPattern.startsWith("*")) {
        QString suffix = normalizedPattern.mid(1); // Remove "*"
        if (suffix.isEmpty()) {
            return true; // "*" matches everything
        }
        return normalizedDomain.endsWith(suffix);
    }
    
    // Handle wildcard patterns ending with * (but not starting with *)
    if (normalizedPattern.endsWith("*")) {
        QString prefix = normalizedPattern.left(normalizedPattern.length() - 1); // Remove "*"
        if (prefix.isEmpty()) {
            return true; // "*" matches everything
        }
        return normalizedDomain.startsWith(prefix);
    }
    
    // Exact match
    return normalizedDomain == normalizedPattern;
}

void DomainInterceptor::interceptRequest(QWebEngineUrlRequestInfo &info) {
    QString host = info.requestUrl().host().toLower();
    
    // Always allow qrc: URLs (internal resources) and data URLs
    if (info.requestUrl().scheme() == QLatin1String("qrc") || 
        info.requestUrl().scheme() == QLatin1String("data")) {
        return;
    }

    bool allowed = false;
    for (const QString &domain : whitelist) {
        if (matchesDomainPattern(host, domain)) {
            allowed = true;
            break;
        }
    }

    if (!allowed) {
        qDebug() << "DomainInterceptor: Blocking request to" << info.requestUrl().toString();
        info.block(true);
    }
}

//==============================================================================
// AUTH MANAGER - API INTEGRATION
//==============================================================================

class AuthManager {
public:
    void updateWhitelistedDomains(const QStringList &domains);
    
private:
    void notifyWhitelistChanged(const QStringList &domains);
};

void AuthManager::updateWhitelistedDomains(const QStringList &domains) {
    qDebug() << "AuthManager: Updating whitelisted domains via API:" << domains.size() << "entries";
    
    // Update ConfigManager with new whitelist
    ConfigManager config;
    for (const QString &domain : domains) {
        config.addWhitelistedDomain(domain);
    }
    
    // Notify UI components
    notifyWhitelistChanged(domains);
}

void AuthManager::notifyWhitelistChanged(const QStringList &domains) {
    qDebug() << "AuthManager: Notifying whitelist changed:" << domains.size() << "domains";
    // Implementation would notify UI components and update interceptors
}

//==============================================================================
// BROWSER WINDOW - UI INTEGRATION
//==============================================================================

class BrowserWindow {
private:
    QStringList m_whitelist;
    ConfigManager *m_config;
    DomainInterceptor *m_interceptor;

public:
    BrowserWindow();
    void updateWhitelistedDomainsFromAPI(const QStringList &domains);
    void testWhitelistingSystem();
};

BrowserWindow::BrowserWindow() {
    m_config = new ConfigManager();
    m_interceptor = new DomainInterceptor();
    
    // Initialize with current whitelist
    m_whitelist = m_config->getAdminWhitelistedDomains();
    m_interceptor->setAllowedDomains(m_whitelist);
}

void BrowserWindow::updateWhitelistedDomainsFromAPI(const QStringList &domains) {
    qDebug() << "BrowserWindow: Updating whitelisted domains via API:" << domains;
    
    // Update local whitelist
    m_whitelist = domains;
    
    // Update ConfigManager
    for (const QString &domain : domains) {
        m_config->addWhitelistedDomain(domain);
    }
    
    // Update interceptor
    m_interceptor->setAllowedDomains(domains);
}

void BrowserWindow::testWhitelistingSystem() {
    qDebug() << "=== TESTING WHITELISTING SYSTEM ===";
    
    // Test current whitelist configuration
    qDebug() << "Current whitelist configuration:";
    qDebug() << "Admin whitelisted domains:" << m_config->getAdminWhitelistedDomains();
    qDebug() << "Regular whitelisted domains:" << m_config->getWhitelistedDomains();
    
    // Test domain checking
    QStringList testDomains = {"google.com", "facebook.com", "*.github.com", "test.com"};
    
    for (const QString &domain : testDomains) {
        bool allowed = m_config->isDomainAllowed(domain);
        qDebug() << "Domain" << domain << ":" << (allowed ? "ALLOWED" : "BLOCKED");
    }
    
    // Test adding a new domain to admin whitelist
    qDebug() << "\nTesting adding domain to admin whitelist...";
    bool added = m_config->addWhitelistedDomain("test-whitelist.com");
    qDebug() << "Added test-whitelist.com to admin whitelist:" << added;
    
    bool testAllowed = m_config->isDomainAllowed("test-whitelist.com");
    qDebug() << "test-whitelist.com now allowed:" << testAllowed;
    
    // Test removing domain
    qDebug() << "\nTesting removing domain from admin whitelist...";
    bool removed = m_config->removeWhitelistedDomain("test-whitelist.com");
    qDebug() << "Removed test-whitelist.com from admin whitelist:" << removed;
    
    bool testBlocked = m_config->isDomainAllowed("test-whitelist.com");
    qDebug() << "test-whitelist.com after removal:" << (testBlocked ? "ALLOWED" : "BLOCKED");
    
    qDebug() << "=== END WHITELISTING SYSTEM TEST ===";
}

//==============================================================================
// USAGE EXAMPLE
//==============================================================================

/*
 * HOW TO USE THIS SYSTEM:
 * 
 * 1. Initialize components:
 *    ConfigManager config;
 *    DomainInterceptor interceptor;
 *    BrowserWindow browser;
 * 
 * 2. Load configuration from config.json:
 *    // config.json structure:
 *    {
 *      "security": {
 *        "admin_whitelisted_domains": ["*.google.com", "github.com"],
 *        "whitelisted_domains": ["example.com"]
 *      }
 *    }
 * 
 * 3. Check domain access:
 *    bool allowed = config.isDomainAllowed("mail.google.com"); // true
 *    bool blocked = config.isDomainAllowed("facebook.com");   // false
 * 
 * 4. Manage whitelist:
 *    config.addWhitelistedDomain("*.stackoverflow.com");
 *    config.removeWhitelistedDomain("example.com");
 *    config.clearWhitelistedDomains();
 * 
 * 5. Set up URL interception:
 *    interceptor.setAllowedDomains(config.getAdminWhitelistedDomains());
 *    // Assign interceptor to QWebEngineProfile
 * 
 * 6. API integration:
 *    AuthManager auth;
 *    auth.updateWhitelistedDomains({"api.example.com", "*.service.com"});
 * 
 * PATTERN MATCHING EXAMPLES:
 * - "google.com" matches "google.com" only
 * - "*.google.com" matches "google.com", "mail.google.com", "docs.google.com"
 * - "*google*" matches "google.com", "mail.google.com", "google-analytics.com"
 * - "*.google.*" matches "google.com", "google.co.uk", "mail.google.com"
 * - "google*" matches "google.com", "google-analytics.com"
 * - "*google" matches "google.com", "mail.google"
 * - "*" matches all domains
 */
