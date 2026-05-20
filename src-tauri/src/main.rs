// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection, Result};
use serde_json::Value;
use std::sync::Mutex;
use tauri::generate_context;

struct AppState {
    db: Mutex<Connection>,
}
fn init_db() -> Result<Connection> {
    // Utiliser le dossier AppData pour stocker la base de données
    let db_path = if cfg!(debug_assertions) {
        // En développement : utiliser le dossier target (non surveillé)
        let current_exe = std::env::current_exe().unwrap_or_else(|_| std::path::PathBuf::from("."));
        let target_dir = current_exe
            .parent()
            .unwrap_or_else(|| std::path::Path::new("."));
        target_dir
            .join("suivi_dossiers.db")
            .to_str()
            .unwrap_or("suivi_dossiers.db")
            .to_string()
    } else {
        // En production : utiliser le dossier AppData
        let app_data = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
        let app_folder = format!("{}/suivi_dossiers", app_data);
        let _ = std::fs::create_dir_all(&app_folder);
        format!("{}/suivi_dossiers.db", app_folder)
    };

    println!("Database path: {}", db_path);
    let conn = Connection::open(db_path)?;

    // SQL sans commentaires avec ===
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS Agent (
            PersonnelID INTEGER PRIMARY KEY AUTOINCREMENT,
            Matricule TEXT UNIQUE NOT NULL,
            Cle TEXT,
            Nom TEXT NOT NULL,
            Prenom TEXT NOT NULL,
            GradeID INTEGER,
            Service TEXT,
            Entite TEXT,
            Sexe TEXT,
            Photo TEXT
        );
        
        CREATE TABLE IF NOT EXISTS Rapport (
            RapportID INTEGER PRIMARY KEY AUTOINCREMENT,
            LibelleRapport TEXT NOT NULL,
            NumeroRapport TEXT UNIQUE NOT NULL,
            DateRapport DATE NOT NULL,
            TypeInspection TEXT,
            PeriodeSousRevue TEXT,
            Fichier TEXT
        );
        
        CREATE TABLE IF NOT EXISTS Dossier (
            DossierID INTEGER PRIMARY KEY AUTOINCREMENT,
            PersonnelID INTEGER NOT NULL,
            TypeInconduite TEXT,
            PeriodeInconduite TEXT,
            Annee INTEGER,
            ServiceInvestigation TEXT,
            Etat TEXT DEFAULT 'En cours',
            SuiteReservee TEXT,
            TypeSanction TEXT,
            Sanction TEXT,
            ActeSanction TEXT,
            NumeroActeSanction TEXT,
            AutoriteSanction TEXT,
            Observations TEXT,
            IDRapport INTEGER,
            FOREIGN KEY (PersonnelID) REFERENCES Agent(PersonnelID) ON DELETE CASCADE,
            FOREIGN KEY (IDRapport) REFERENCES Rapport(RapportID) ON DELETE SET NULL
        );
        
        CREATE TABLE IF NOT EXISTS Recommandation (
            RecommandationID INTEGER PRIMARY KEY AUTOINCREMENT,
            Services TEXT,
            Source TEXT,
            RapportID INTEGER NOT NULL,
            ProblemeFaiblesse TEXT,
            NumeroRecommandation TEXT,
            TexteRecommandation TEXT NOT NULL,
            ResponsableMiseEnOeuvre TEXT,
            ActeursImpliques TEXT,
            InstanceValidation TEXT,
            Echeance TEXT,
            Domaine TEXT,
            FOREIGN KEY (RapportID) REFERENCES Rapport(RapportID) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS SuiviRecommandation (
            SuiviID INTEGER PRIMARY KEY AUTOINCREMENT,
            RecommandationID INTEGER NOT NULL,
            MesuresCorrectives TEXT,
            DateDebut TEXT,
            DateFin TEXT,
            NiveauMiseEnOeuvre TEXT DEFAULT 'Non commencé',
            ObservationDelai TEXT,
            ObservationMiseEnOeuvre TEXT,
            AppreciationControle TEXT,
            ReferenceJustificatif TEXT,
            FOREIGN KEY (RecommandationID) REFERENCES Recommandation(RecommandationID) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS Document (
            DocumentID INTEGER PRIMARY KEY AUTOINCREMENT,
            NomFichier TEXT NOT NULL,
            Fichier TEXT,
            TypeDocument TEXT,
            RapportID INTEGER,
            SuiviID INTEGER,
            FOREIGN KEY (RapportID) REFERENCES Rapport(RapportID) ON DELETE CASCADE,
            FOREIGN KEY (SuiviID) REFERENCES SuiviRecommandation(SuiviID) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS Grade (
            GradeID INTEGER PRIMARY KEY AUTOINCREMENT,
            LibelleGrade TEXT NOT NULL UNIQUE,
            Ordre INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS Sanction (
            SanctionID INTEGER PRIMARY KEY AUTOINCREMENT,
            LibelleSanction TEXT NOT NULL UNIQUE,
            Categorie TEXT,
            Niveau INTEGER
        );
        
        CREATE TABLE IF NOT EXISTS ServiceInvestigation (
            ServiceID INTEGER PRIMARY KEY AUTOINCREMENT,
            LibelleService TEXT NOT NULL UNIQUE,
            Acronyme TEXT,
            Ordre INTEGER,
            Actif INTEGER DEFAULT 1
        );
                
        CREATE TABLE IF NOT EXISTS Signataire (
            SignataireID INTEGER PRIMARY KEY AUTOINCREMENT,
            Nom TEXT NOT NULL,
            Prenom TEXT NOT NULL,
            Grade TEXT,
            Fonction TEXT NOT NULL,
            TitreHonorifique TEXT,
            Statut INTEGER DEFAULT 1,
            Ordre INTEGER,
            CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(Nom, Prenom, Fonction) 
        );
        
        CREATE TABLE IF NOT EXISTS ParametresGeneraux (
            ParametreID INTEGER PRIMARY KEY AUTOINCREMENT,
            Code TEXT UNIQUE NOT NULL,
            Valeur TEXT,
            Description TEXT,
            UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UpdatedBy TEXT
        );
        
        CREATE TABLE IF NOT EXISTS EnteteDocument (
            EnteteID INTEGER PRIMARY KEY AUTOINCREMENT,
            TypeDocument TEXT NOT NULL,
            Champ TEXT NOT NULL,
            Valeur TEXT,
            Ordre INTEGER DEFAULT 0,
            Actif INTEGER DEFAULT 1,
            Style TEXT,
            CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(TypeDocument, Champ)
        );
        
        CREATE TABLE IF NOT EXISTS HistoriqueDocuments (
            HistoriqueID INTEGER PRIMARY KEY AUTOINCREMENT,
            TypeDocument TEXT NOT NULL,
            Reference TEXT NOT NULL,
            Objet TEXT,
            Expediteur TEXT,
            Destinataire TEXT,
            SignataireID INTEGER,
            DateEmission DATETIME DEFAULT CURRENT_TIMESTAMP,
            Contenu TEXT,
            FichierPath TEXT,
            Statut TEXT DEFAULT 'Généré',
            CreatedBy TEXT,
            CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (SignataireID) REFERENCES Signataire(SignataireID)
        );
        
        CREATE TABLE IF NOT EXISTS HistoriqueRecherches (
            RechercheID INTEGER PRIMARY KEY AUTOINCREMENT,
            TypeRecherche TEXT,
            Valeur TEXT,
            ResultatsCount INTEGER,
            DateRecherche DATETIME DEFAULT CURRENT_TIMESTAMP,
            Utilisateur TEXT
        );
        
        CREATE TABLE IF NOT EXISTS Logs (
            LogID INTEGER PRIMARY KEY AUTOINCREMENT,
            Utilisateur TEXT NOT NULL,
            Action TEXT NOT NULL,
            TableConcernee TEXT NOT NULL,
            EnregistrementID INTEGER,
            AnciennesValeurs TEXT,
            NouvellesValeurs TEXT,
            AdresseIP TEXT,
            SessionID TEXT,
            Details TEXT,
            DateLog DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        -- ==================== TABLES D'AUTHENTIFICATION ====================
        
        CREATE TABLE IF NOT EXISTS Utilisateur (
            UtilisateurID INTEGER PRIMARY KEY AUTOINCREMENT,
            NomUtilisateur TEXT UNIQUE NOT NULL,
            Email TEXT UNIQUE NOT NULL,
            MotDePasse TEXT NOT NULL,
            Nom TEXT,
            Prenom TEXT,
            Role TEXT DEFAULT 'user',
            Statut INTEGER DEFAULT 1,
            TentativesConnexion INTEGER DEFAULT 0,
            DerniereConnexion DATETIME,
            DateCreation DATETIME DEFAULT CURRENT_TIMESTAMP,
            DateModification DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS Session (
            SessionID INTEGER PRIMARY KEY AUTOINCREMENT,
            Token TEXT UNIQUE NOT NULL,
            UtilisateurID INTEGER NOT NULL,
            DateCreation DATETIME DEFAULT CURRENT_TIMESTAMP,
            DateExpiration DATETIME,
            AdresseIP TEXT,
            Actif INTEGER DEFAULT 1,
            FOREIGN KEY (UtilisateurID) REFERENCES Utilisateur(UtilisateurID) ON DELETE CASCADE
        );
        
        CREATE TABLE IF NOT EXISTS Permission (
            PermissionID INTEGER PRIMARY KEY AUTOINCREMENT,
            Code TEXT UNIQUE NOT NULL,
            Libelle TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS RolePermission (
            RolePermissionID INTEGER PRIMARY KEY AUTOINCREMENT,
            Role TEXT NOT NULL,
            PermissionID INTEGER NOT NULL,
            FOREIGN KEY (PermissionID) REFERENCES Permission(PermissionID) ON DELETE CASCADE,
            UNIQUE(Role, PermissionID)
        );
        
        -- INDEX
        CREATE INDEX IF NOT EXISTS idx_dossier_personnel ON Dossier(PersonnelID);
        CREATE INDEX IF NOT EXISTS idx_recommandation_rapport ON Recommandation(RapportID);
        CREATE INDEX IF NOT EXISTS idx_entete_document ON EnteteDocument(TypeDocument, Actif);
        CREATE INDEX IF NOT EXISTS idx_historique_destinataire ON HistoriqueDocuments(Destinataire);
        CREATE INDEX IF NOT EXISTS idx_historique_date ON HistoriqueDocuments(DateEmission);
        CREATE INDEX IF NOT EXISTS idx_historique_type ON HistoriqueDocuments(TypeDocument);
        CREATE INDEX IF NOT EXISTS idx_logs_utilisateur ON Logs(Utilisateur);
        CREATE INDEX IF NOT EXISTS idx_logs_date ON Logs(DateLog);
        CREATE INDEX IF NOT EXISTS idx_logs_action ON Logs(Action);
        CREATE INDEX IF NOT EXISTS idx_logs_table ON Logs(TableConcernee);
        CREATE INDEX IF NOT EXISTS idx_session_token ON Session(Token);
        CREATE INDEX IF NOT EXISTS idx_session_utilisateur ON Session(UtilisateurID);
        CREATE INDEX IF NOT EXISTS idx_utilisateur_email ON Utilisateur(Email);
        CREATE INDEX IF NOT EXISTS idx_utilisateur_nom ON Utilisateur(NomUtilisateur);
        "
    )?;

    println!("✅ Tables créées avec succès");

    // ==================== INSERTION DES GRADES ====================
    let grades = vec![
        (1, "Adjudant-Chef de Police"),
        (2, "Adjudant-Chef Major de Police"),
        (3, "Capitaine de Police"),
        (4, "Commandant de Police"),
        (5, "Commandant Major de Police"),
        (6, "Commissaire de Police"),
        (7, "Commissaire Divisionnaire de Police"),
        (8, "Commissaire Principal de Police"),
        (9, "Contrôleur Général de Police"),
        (10, "Inspecteur Général de Police"),
        (11, "Lieutenant de police"),
        (12, "Médecin-Commissaire Divisionnaire de Police"),
        (13, "Médecin-Commissaire Principal de Police"),
        (14, "Sergent de Police"),
        (15, "Sergent-Chef de Police"),
        (16, "Sous-lieutenant de Police"),
        (17, "Maréchal des logies"),
        (18, "MDL-Chef"),
        (19, "Elève officier de police"),
        (20, "Capitaine de Gendarmerie"),
        (21, "Commandant de Gendarmerie"),
        (22, "Adjudant-Chef Major"),
        (23, "Adjudant"),
        (24, "Maréchal des Logis Chef"),
        (25, "Maréchal des Logis"),
        (26, "Adjudant-Chef"),
        (28, "Adjudant de Police"),
    ];

    for (id, libelle) in &grades {
        conn.execute(
            "INSERT OR IGNORE INTO Grade (GradeID, LibelleGrade, Ordre) VALUES (?1, ?2, ?3)",
            params![id, libelle, id],
        )
        .ok();
    }
    println!("✅ Grades insérés: {}", grades.len());

    // ==================== INSERTION DES SANCTIONS ====================
    let sanctions = vec![
        "Avertissement avec inscription au dossier",
        "Consigne au casernement",
        "Arrêt simple",
        "Détention en salle de police",
        "Arrêt de rigueur",
        "Blâme",
        "Radiation du tableau d'avancement",
        "Abaissement d'échelon",
        "Rétrogradation",
        "Mise à la retraite d'office",
        "Révocation",
        "Licenciement",
    ];

    for (i, sanction) in sanctions.iter().enumerate() {
        conn.execute(
            "INSERT OR IGNORE INTO Sanction (LibelleSanction, Niveau) VALUES (?1, ?2)",
            params![sanction, i as i64 + 1],
        )
        .ok();
    }
    println!("✅ Sanctions insérées: {}", sanctions.len());

    // ==================== INSERTION DES SERVICES D'INVESTIGATION ====================
    let services = vec![
        (1, "L'Inspection technique des services (ITS)", "ITS"),
        (
            2,
            "le Service contrôle de la direction générale de la police nationale",
            "SC-DGPN",
        ),
        (
            3,
            "la Coordination nationale de contrôle des forces de police",
            "CONACFP",
        ),
        (4, "le contrôle interne de l'Académie de police", "ACADEMIE"),
        (
            5,
            "le contrôle interne de l'Ecole nationale de police",
            "ENP",
        ),
        (
            6,
            "le contrôle interne de l'Office national d'identification",
            "ONI",
        ),
        (
            7,
            "le contrôle interne de l'Office national de sécurisation des sites miniers",
            "ONASSIM",
        ),
        (
            8,
            "le contrôle interne de l'Office national de sécurité routière",
            "ONASER",
        ),
        (
            9,
            "L'Autorité Supérieure de Contrôle de Contrôle d'Etat",
            "ASCE-LC",
        ),
        (10, "L'Inspection Générale des Finances", "IGF"),
        (
            11,
            "L'Inspection générale des forces armées nationales",
            "IGFAN",
        ),
        (
            12,
            "l'Inspection interne de la Gendarmerie nationale",
            "GENDARMERIE",
        ),
        (
            13,
            "le Réseau national de lutte contre la corruption",
            "REN-LAC",
        ),
    ];

    for (id, libelle, acronyme) in &services {
        conn.execute(
            "INSERT OR IGNORE INTO ServiceInvestigation (ServiceID, LibelleService, Acronyme, Ordre, Actif) VALUES (?1, ?2, ?3, ?4, 1)",
            params![id, libelle, acronyme, id],
        ).ok();
    }
    println!("✅ Services investigation insérés: {}", services.len());

    // ==================== INSERTION DES PARAMÈTRES GÉNÉRAUX ====================
    let parametres = vec![
        (
            "MINISTERE",
            "MINISTERE DE LA SECURITE",
            "Ministère de tutelle",
        ),
        ("CABINET", "CABINET", "Cabinet ministériel"),
        (
            "SERVICE",
            "INSPECTION TECHNIQUE DES SERVICES",
            "Service émetteur",
        ),
        ("PAYS", "BURKINA FASO", "Pays"),
        (
            "DEVISE",
            "La Patrie ou la Mort, nous vaincrons",
            "Devise nationale",
        ),
        ("LOGO_PATH", "", "Chemin du logo"),
        (
            "SERVICE_POLICE",
            "DIRECTION GENERALE DE LA POLICE NATIONALE",
            "Service pour liste agents",
        ),
        (
            "SERVICE_RH",
            "DIRECTION DES RESSOURCES HUMAINES",
            "Service RH pour liste agents",
        ),
    ];

    for (code, valeur, description) in &parametres {
        conn.execute(
            "INSERT OR IGNORE INTO ParametresGeneraux (Code, Valeur, Description, UpdatedBy) VALUES (?1, ?2, ?3, 'System')",
            params![code, valeur, description],
        ).ok();
    }
    println!("✅ Paramètres généraux insérés: {}", parametres.len());

    // ==================== INSERTION DES ENTÊTES PAR DÉFAUT ====================

    // 1. RAPPORT
    let entetes_rapport = vec![
        ("MINISTERE", "[MINISTERE]", 1),
        ("SEPARATEUR1", "---", 2),
        ("CABINET", "[CABINET]", 3),
        ("SEPARATEUR2", "---", 4),
        ("SERVICE", "[SERVICE]", 5),
        ("SEPARATEUR3", "---", 6),
        ("PAYS", "[PAYS]", 7),
        ("DEVISE", "[DEVISE]", 8),
    ];
    for (champ, valeur, ordre) in &entetes_rapport {
        conn.execute(
        "INSERT OR IGNORE INTO EnteteDocument (TypeDocument, Champ, Valeur, Ordre) VALUES ('RAPPORT', ?1, ?2, ?3)",
        params![champ, valeur, ordre],
    ).ok();
    }
    println!("✅ Entêtes RAPPORT insérées: {}", entetes_rapport.len());

    // 2. AGENT (Liste des agents)
    let entetes_agent = vec![
        ("MINISTERE", "[MINISTERE]", 1),
        ("SEPARATEUR1", "---", 2),
        ("DIRECTION", "[SERVICE_POLICE]", 3),
        ("SEPARATEUR2", "---", 4),
        ("SERVICE", "[SERVICE_RH]", 5),
        ("SEPARATEUR3", "---", 6),
        ("PAYS", "[PAYS]", 7),
        ("DEVISE", "[DEVISE]", 8),
        ("TITRE", "LISTE DES AGENTS", 9),
    ];
    for (champ, valeur, ordre) in &entetes_agent {
        conn.execute(
        "INSERT OR IGNORE INTO EnteteDocument (TypeDocument, Champ, Valeur, Ordre) VALUES ('AGENT', ?1, ?2, ?3)",
        params![champ, valeur, ordre],
    ).ok();
    }
    println!("✅ Entêtes AGENT insérées: {}", entetes_agent.len());

    // 3. DOSSIER
    let entetes_dossier = vec![
        ("MINISTERE", "[MINISTERE]", 1),
        ("SEPARATEUR1", "---", 2),
        ("SERVICE", "[SERVICE_POLICE]", 3),
        ("SEPARATEUR2", "---", 4),
        ("TITRE", "DOSSIER D'INCONDUITE", 5),
        ("PAYS", "[PAYS]", 6),
        ("DEVISE", "[DEVISE]", 7),
    ];
    for (champ, valeur, ordre) in &entetes_dossier {
        conn.execute(
        "INSERT OR IGNORE INTO EnteteDocument (TypeDocument, Champ, Valeur, Ordre) VALUES ('DOSSIER', ?1, ?2, ?3)",
        params![champ, valeur, ordre],
    ).ok();
    }
    println!("✅ Entêtes DOSSIER insérées: {}", entetes_dossier.len());

    // 4. RECOMMANDATION
    let entetes_reco = vec![
        ("MINISTERE", "[MINISTERE]", 1),
        ("SEPARATEUR1", "---", 2),
        ("SERVICE", "[SERVICE]", 3),
        ("SEPARATEUR2", "---", 4),
        ("PAYS", "[PAYS]", 5),
        ("DEVISE", "[DEVISE]", 6),
    ];
    for (champ, valeur, ordre) in &entetes_reco {
        conn.execute(
        "INSERT OR IGNORE INTO EnteteDocument (TypeDocument, Champ, Valeur, Ordre) VALUES ('RECOMMANDATION', ?1, ?2, ?3)",
        params![champ, valeur, ordre],
    ).ok();
    }
    println!("✅ Entêtes RECOMMANDATION insérées: {}", entetes_reco.len());

    // 5. SUIVI_RECOMMANDATIONS (NOUVEAU)
    let entetes_suivi = vec![
        ("MINISTERE", "[MINISTERE]", 1),
        ("SEPARATEUR1", "---", 2),
        ("SERVICE", "[SERVICE]", 3),
        ("SEPARATEUR2", "---", 4),
        ("TITRE", "SUIVI DES RECOMMANDATIONS", 5),
        ("PAYS", "[PAYS]", 6),
        ("DEVISE", "[DEVISE]", 7),
        ("PERIODE", "Période du [DATE_DEBUT] au [DATE_FIN]", 8),
    ];
    for (champ, valeur, ordre) in &entetes_suivi {
        conn.execute(
        "INSERT OR IGNORE INTO EnteteDocument (TypeDocument, Champ, Valeur, Ordre) VALUES ('SUIVI_RECOMMANDATIONS', ?1, ?2, ?3)",
        params![champ, valeur, ordre],
    ).ok();
    }
    println!(
        "✅ Entêtes SUIVI_RECOMMANDATIONS insérées: {}",
        entetes_suivi.len()
    );

    // ==================== INSERTION DES SIGNATAIRES ====================

    // 1. Supprimer les anciens doublons
    conn.execute(
        "DELETE FROM Signataire WHERE Nom = 'KORGO' AND Prenom = 'Jacques'",
        [],
    )
    .ok();

    // 2. Insérer un seul signataire
    let signataires = vec![(
        "KORGO",                            // Nom
        "Jacques",                          // Prénom
        "Lieutenant de Police",             // Grade
        "Développeur",                      // Fonction
        "Chevalier de l'Ordre de l'Etalon", // TitreHonorifique
        1,                                  // Statut (1 = actif)
        1,                                  // Ordre
    )];

    for (nom, prenom, grade, fonction, titre, statut, ordre) in &signataires {
        conn.execute(
        "INSERT INTO Signataire (Nom, Prenom, Grade, Fonction, TitreHonorifique, Statut, Ordre) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![nom, prenom, grade, fonction, titre, statut, ordre],
    ).ok();
    }

    println!("✅ Signataires insérés: {}", signataires.len());

    // ==================== INSERTION DES PERMISSIONS ====================
    let permissions = vec![
        ("agents.view", "Voir les agents"),
        ("agents.create", "Créer des agents"),
        ("agents.edit", "Modifier des agents"),
        ("agents.delete", "Supprimer des agents"),
        ("rapports.view", "Voir les rapports"),
        ("rapports.create", "Créer des rapports"),
        ("rapports.edit", "Modifier des rapports"),
        ("rapports.delete", "Supprimer des rapports"),
        ("dossiers.view", "Voir les dossiers"),
        ("dossiers.create", "Créer des dossiers"),
        ("dossiers.edit", "Modifier des dossiers"),
        ("dossiers.delete", "Supprimer des dossiers"),
        ("recommandations.view", "Voir les recommandations"),
        ("recommandations.create", "Créer des recommandations"),
        ("recommandations.edit", "Modifier des recommandations"),
        ("recommandations.delete", "Supprimer des recommandations"),
        ("recommandations.suivi", "Suivre les recommandations"),
        ("admin.users", "Gérer les utilisateurs"),
        ("admin.roles", "Gérer les rôles"),
        ("admin.permissions", "Gérer les permissions"),
        ("parametres.view", "Voir les paramètres"),
        ("parametres.edit", "Modifier les paramètres"),
        ("logs.view", "Voir les logs"),
    ];

    for (code, libelle) in &permissions {
        conn.execute(
            "INSERT OR IGNORE INTO Permission (Code, Libelle) VALUES (?1, ?2)",
            params![code, libelle],
        )
        .ok();
    }
    println!("✅ Permissions insérées: {}", permissions.len());

    // ==================== INSERTION DES RÔLES ET PERMISSIONS ====================
    // Rôle admin avec toutes les permissions
    let admin_permissions: Vec<String> = permissions
        .iter()
        .map(|(code, _)| code.to_string())
        .collect();
    for perm_code in admin_permissions {
        let perm_id: i64 = conn
            .query_row(
                "SELECT PermissionID FROM Permission WHERE Code = ?1",
                [&perm_code],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if perm_id > 0 {
            conn.execute(
                "INSERT OR IGNORE INTO RolePermission (Role, PermissionID) VALUES ('admin', ?1)",
                [perm_id],
            )
            .ok();
        }
    }

    // Rôle user avec permissions de base
    let user_permissions = vec![
        "agents.view",
        "rapports.view",
        "dossiers.view",
        "recommandations.view",
        "recommandations.suivi",
    ];
    for perm_code in user_permissions {
        let perm_id: i64 = conn
            .query_row(
                "SELECT PermissionID FROM Permission WHERE Code = ?1",
                [perm_code],
                |row| row.get(0),
            )
            .unwrap_or(0);
        if perm_id > 0 {
            conn.execute(
                "INSERT OR IGNORE INTO RolePermission (Role, PermissionID) VALUES ('user', ?1)",
                [perm_id],
            )
            .ok();
        }
    }
    println!("✅ Rôles et permissions configurés");

    // ==================== CRÉATION DE L'UTILISATEUR ADMIN PAR DÉFAUT ====================
    use bcrypt::{hash, DEFAULT_COST};
    let admin_password = hash("admin123", DEFAULT_COST).unwrap_or_default();

    conn.execute(
        "INSERT OR IGNORE INTO Utilisateur (NomUtilisateur, Email, MotDePasse, Nom, Prenom, Role, Statut) 
         VALUES ('admin', 'admin@example.com', ?1, 'Administrateur', 'Système', 'admin', 1)",
        params![admin_password],
    ).ok();

    println!("✅ Utilisateur admin créé avec:");
    println!("   - Email: admin@example.com");
    println!("   - Mot de passe: admin123");

    // ==================== LOG INITIAL ====================
    let _ = conn.execute(
        "INSERT INTO Logs (Utilisateur, Action, TableConcernee, Details) VALUES (?1, ?2, ?3, ?4)",
        params![
            "System",
            "CREATE",
            "Database",
            "Initialisation de la base de données avec authentification"
        ],
    );

    // ==================== RÉCAPITULATIF ====================
    let nb_grades = grades.len();
    let nb_sanctions = sanctions.len();
    let nb_services = services.len();
    let nb_parametres = parametres.len();
    let nb_entetes_rapport = entetes_rapport.len();
    let nb_entetes_agent = entetes_agent.len();
    let nb_entetes_reco = entetes_reco.len();
    let nb_entetes_dossier = entetes_dossier.len();
    let nb_signataires = signataires.len();
    let nb_permissions = permissions.len();

    println!("\n📊 RÉCAPITULATIF DE L'INITIALISATION DE LA BASE DE DONNÉES:");
    println!("   - Grades: {} entrées", nb_grades);
    println!("   - Sanctions: {} entrées", nb_sanctions);
    println!("   - Services investigation: {} entrées", nb_services);
    println!("   - Paramètres généraux: {} entrées", nb_parametres);
    println!("   - Entêtes RAPPORT: {} entrées", nb_entetes_rapport);
    println!("   - Entêtes AGENT: {} entrées", nb_entetes_agent);
    println!("   - Entêtes RECOMMANDATION: {} entrées", nb_entetes_reco);
    println!("   - Entêtes DOSSIER: {} entrées", nb_entetes_dossier);
    println!("   - Signataires: {} entrées", nb_signataires);
    println!("   - Permissions: {} entrées", nb_permissions);
    println!("   - Utilisateur admin créé");
    println!("✅ Base de données initialisée avec succès!");

    Ok(conn)
}
// ==================== COMMANDES AGENTS ====================
#[tauri::command]
fn create_agent(state: tauri::State<AppState>, agent: Value) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO Agent (Matricule, Cle, Nom, Prenom, GradeID, Service, Entite, Sexe, Photo) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            agent["Matricule"].as_str().unwrap_or(""),
            agent["Cle"].as_str().unwrap_or(""),
            agent["Nom"].as_str().unwrap_or(""),
            agent["Prenom"].as_str().unwrap_or(""),
            agent["GradeID"].as_i64().unwrap_or(0),
            agent["Service"].as_str().unwrap_or(""),
            agent["Entite"].as_str().unwrap_or(""),
            agent["Sexe"].as_str().unwrap_or(""),
            agent["Photo"].as_str().unwrap_or(""),
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    Ok(id)
}

#[tauri::command]
fn get_agents(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT * FROM Agent ORDER BY Nom, Prenom")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "PersonnelID": row.get::<_, i64>(0)?,
                "Matricule": row.get::<_, String>(1)?,
                "Cle": row.get::<_, Option<String>>(2)?,
                "Nom": row.get::<_, String>(3)?,
                "Prenom": row.get::<_, String>(4)?,
                "GradeID": row.get::<_, Option<i64>>(5)?,
                "Service": row.get::<_, Option<String>>(6)?,
                "Entite": row.get::<_, Option<String>>(7)?,
                "Sexe": row.get::<_, Option<String>>(8)?,
                "Photo": row.get::<_, Option<String>>(9)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn update_agent(state: tauri::State<AppState>, agent: Value) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE Agent SET Matricule=?1, Cle=?2, Nom=?3, Prenom=?4, GradeID=?5, 
         Service=?6, Entite=?7, Sexe=?8, Photo=?9 WHERE PersonnelID=?10",
        params![
            agent["Matricule"].as_str().unwrap_or(""),
            agent["Cle"].as_str().unwrap_or(""),
            agent["Nom"].as_str().unwrap_or(""),
            agent["Prenom"].as_str().unwrap_or(""),
            agent["GradeID"].as_i64().unwrap_or(0),
            agent["Service"].as_str().unwrap_or(""),
            agent["Entite"].as_str().unwrap_or(""),
            agent["Sexe"].as_str().unwrap_or(""),
            agent["Photo"].as_str().unwrap_or(""),
            agent["PersonnelID"].as_i64().unwrap_or(0),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_agent(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM Agent WHERE PersonnelID=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== COMMANDES RAPPORTS ====================
#[tauri::command]
fn create_rapport(state: tauri::State<AppState>, rapport: Value) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO Rapport (LibelleRapport, NumeroRapport, DateRapport, TypeInspection, PeriodeSousRevue, Fichier) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            rapport["LibelleRapport"].as_str().unwrap_or(""),
            rapport["NumeroRapport"].as_str().unwrap_or(""),
            rapport["DateRapport"].as_str().unwrap_or(""),
            rapport["TypeInspection"].as_str().unwrap_or(""),
            rapport["PeriodeSousRevue"].as_str().unwrap_or(""),
            rapport["Fichier"].as_str().unwrap_or(""),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn get_rapports(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT * FROM Rapport ORDER BY DateRapport DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "RapportID": row.get::<_, i64>(0)?,
                "LibelleRapport": row.get::<_, String>(1)?,
                "NumeroRapport": row.get::<_, String>(2)?,
                "DateRapport": row.get::<_, String>(3)?,
                "TypeInspection": row.get::<_, Option<String>>(4)?,
                "PeriodeSousRevue": row.get::<_, Option<String>>(5)?,
                "Fichier": row.get::<_, Option<String>>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn update_rapport(state: tauri::State<AppState>, rapport: Value) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE Rapport SET LibelleRapport=?1, NumeroRapport=?2, DateRapport=?3, 
         TypeInspection=?4, PeriodeSousRevue=?5, Fichier=?6 WHERE RapportID=?7",
        params![
            rapport["LibelleRapport"].as_str().unwrap_or(""),
            rapport["NumeroRapport"].as_str().unwrap_or(""),
            rapport["DateRapport"].as_str().unwrap_or(""),
            rapport["TypeInspection"].as_str().unwrap_or(""),
            rapport["PeriodeSousRevue"].as_str().unwrap_or(""),
            rapport["Fichier"].as_str().unwrap_or(""),
            rapport["RapportID"].as_i64().unwrap_or(0),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_rapport(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM Rapport WHERE RapportID=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== COMMANDES DOSSIERS ====================
#[tauri::command]
fn create_dossier(state: tauri::State<AppState>, dossier: Value) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO Dossier (PersonnelID, TypeInconduite, PeriodeInconduite, Annee, 
         ServiceInvestigation, Etat, SuiteReservee, TypeSanction, Sanction, 
         ActeSanction, NumeroActeSanction, AutoriteSanction, Observations, IDRapport) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            dossier["PersonnelID"]
                .as_i64()
                .ok_or("PersonnelID manquant")?,
            dossier["TypeInconduite"].as_str().unwrap_or(""),
            dossier["PeriodeInconduite"].as_str().unwrap_or(""),
            dossier["Annee"].as_i64().unwrap_or(0),
            dossier["ServiceInvestigation"].as_str().unwrap_or(""),
            dossier["Etat"].as_str().unwrap_or("En cours"),
            dossier["SuiteReservee"].as_str().unwrap_or(""),
            dossier["TypeSanction"].as_str().unwrap_or(""),
            dossier["Sanction"].as_str().unwrap_or(""),
            dossier["ActeSanction"].as_str().unwrap_or(""),
            dossier["NumeroActeSanction"].as_str().unwrap_or(""),
            dossier["AutoriteSanction"].as_str().unwrap_or(""),
            dossier["Observations"].as_str().unwrap_or(""),
            dossier["IDRapport"].as_i64(),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn get_dossiers(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT d.*, a.Nom, a.Prenom, a.Matricule, g.LibelleGrade as Grade 
         FROM Dossier d 
         LEFT JOIN Agent a ON d.PersonnelID = a.PersonnelID 
         LEFT JOIN Grade g ON a.GradeID = g.GradeID
         ORDER BY d.DossierID DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "DossierID": row.get::<_, i64>(0)?,
                "PersonnelID": row.get::<_, i64>(1)?,
                "TypeInconduite": row.get::<_, Option<String>>(2)?,
                "PeriodeInconduite": row.get::<_, Option<String>>(3)?,
                "Annee": row.get::<_, Option<i64>>(4)?,
                "ServiceInvestigation": row.get::<_, Option<String>>(5)?,
                "Etat": row.get::<_, Option<String>>(6)?,
                "SuiteReservee": row.get::<_, Option<String>>(7)?,
                "TypeSanction": row.get::<_, Option<String>>(8)?,
                "Sanction": row.get::<_, Option<String>>(9)?,
                "ActeSanction": row.get::<_, Option<String>>(10)?,
                "NumeroActeSanction": row.get::<_, Option<String>>(11)?,
                "AutoriteSanction": row.get::<_, Option<String>>(12)?,
                "Observations": row.get::<_, Option<String>>(13)?,
                "IDRapport": row.get::<_, Option<i64>>(14)?,
                "AgentNom": row.get::<_, Option<String>>(15)?,
                "AgentPrenom": row.get::<_, Option<String>>(16)?,
                "AgentMatricule": row.get::<_, Option<String>>(17)?,
                "Grade": row.get::<_, Option<String>>(18)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn update_dossier(state: tauri::State<AppState>, dossier: Value) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE Dossier SET TypeInconduite=?1, PeriodeInconduite=?2, Annee=?3, 
         ServiceInvestigation=?4, Etat=?5, SuiteReservee=?6, TypeSanction=?7, 
         Sanction=?8, ActeSanction=?9, NumeroActeSanction=?10, AutoriteSanction=?11, 
         Observations=?12, IDRapport=?13 WHERE DossierID=?14",
        params![
            dossier["TypeInconduite"].as_str().unwrap_or(""),
            dossier["PeriodeInconduite"].as_str().unwrap_or(""),
            dossier["Annee"].as_i64().unwrap_or(0),
            dossier["ServiceInvestigation"].as_str().unwrap_or(""),
            dossier["Etat"].as_str().unwrap_or("En cours"),
            dossier["SuiteReservee"].as_str().unwrap_or(""),
            dossier["TypeSanction"].as_str().unwrap_or(""),
            dossier["Sanction"].as_str().unwrap_or(""),
            dossier["ActeSanction"].as_str().unwrap_or(""),
            dossier["NumeroActeSanction"].as_str().unwrap_or(""),
            dossier["AutoriteSanction"].as_str().unwrap_or(""),
            dossier["Observations"].as_str().unwrap_or(""),
            dossier["IDRapport"].as_i64().unwrap_or(0),
            dossier["DossierID"].as_i64().unwrap_or(0),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_dossier(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM Dossier WHERE DossierID=?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== COMMANDES RECOMMANDATIONS ====================
#[tauri::command]
fn create_recommandation(
    state: tauri::State<AppState>,
    recommandation: Value,
) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO Recommandation (Services, Source, RapportID, ProblemeFaiblesse, 
         NumeroRecommandation, TexteRecommandation, ResponsableMiseEnOeuvre, 
         ActeursImpliques, InstanceValidation, Echeance, Domaine) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            recommandation["Services"].as_str().unwrap_or(""),
            recommandation["Source"].as_str().unwrap_or(""),
            recommandation["RapportID"].as_i64().unwrap_or(0),
            recommandation["ProblemeFaiblesse"].as_str().unwrap_or(""),
            recommandation["NumeroRecommandation"]
                .as_str()
                .unwrap_or(""),
            recommandation["TexteRecommandation"].as_str().unwrap_or(""),
            recommandation["ResponsableMiseEnOeuvre"]
                .as_str()
                .unwrap_or(""),
            recommandation["ActeursImpliques"].as_str().unwrap_or(""),
            recommandation["InstanceValidation"].as_str().unwrap_or(""),
            recommandation["Echeance"].as_str().unwrap_or(""),
            recommandation["Domaine"].as_str().unwrap_or(""),
        ],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();
    conn.execute(
        "INSERT INTO SuiviRecommandation (RecommandationID, NiveauMiseEnOeuvre) VALUES (?1, 'Non commencé')",
        params![id],
    ).map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
fn get_recommandations(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT r.*, s.NiveauMiseEnOeuvre, s.DateDebut, s.DateFin, s.MesuresCorrectives,
         s.ObservationDelai, s.ObservationMiseEnOeuvre, s.AppreciationControle,
         rap.NumeroRapport, rap.LibelleRapport
         FROM Recommandation r
         LEFT JOIN SuiviRecommandation s ON r.RecommandationID = s.RecommandationID
         LEFT JOIN Rapport rap ON r.RapportID = rap.RapportID
         ORDER BY r.RecommandationID DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "RecommandationID": row.get::<_, i64>(0)?,
                "Services": row.get::<_, Option<String>>(1)?,
                "Source": row.get::<_, Option<String>>(2)?,
                "RapportID": row.get::<_, i64>(3)?,
                "ProblemeFaiblesse": row.get::<_, Option<String>>(4)?,
                "NumeroRecommandation": row.get::<_, Option<String>>(5)?,
                "TexteRecommandation": row.get::<_, String>(6)?,
                "ResponsableMiseEnOeuvre": row.get::<_, Option<String>>(7)?,
                "ActeursImpliques": row.get::<_, Option<String>>(8)?,
                "InstanceValidation": row.get::<_, Option<String>>(9)?,
                "Echeance": row.get::<_, Option<String>>(10)?,
                "Domaine": row.get::<_, Option<String>>(11)?,
                "NiveauMiseEnOeuvre": row.get::<_, Option<String>>(12)?,
                "DateDebut": row.get::<_, Option<String>>(13)?,
                "DateFin": row.get::<_, Option<String>>(14)?,
                "MesuresCorrectives": row.get::<_, Option<String>>(15)?,
                "ObservationDelai": row.get::<_, Option<String>>(16)?,
                "ObservationMiseEnOeuvre": row.get::<_, Option<String>>(17)?,
                "AppreciationControle": row.get::<_, Option<String>>(18)?,
                "NumeroRapport": row.get::<_, Option<String>>(19)?,
                "LibelleRapport": row.get::<_, Option<String>>(20)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn update_recommandation(
    state: tauri::State<AppState>,
    recommandation: Value,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE Recommandation SET Services=?1, Source=?2, RapportID=?3, ProblemeFaiblesse=?4,
         NumeroRecommandation=?5, TexteRecommandation=?6, ResponsableMiseEnOeuvre=?7,
         ActeursImpliques=?8, InstanceValidation=?9, Echeance=?10, Domaine=?11
         WHERE RecommandationID=?12",
        params![
            recommandation["Services"].as_str().unwrap_or(""),
            recommandation["Source"].as_str().unwrap_or(""),
            recommandation["RapportID"].as_i64().unwrap_or(0),
            recommandation["ProblemeFaiblesse"].as_str().unwrap_or(""),
            recommandation["NumeroRecommandation"]
                .as_str()
                .unwrap_or(""),
            recommandation["TexteRecommandation"].as_str().unwrap_or(""),
            recommandation["ResponsableMiseEnOeuvre"]
                .as_str()
                .unwrap_or(""),
            recommandation["ActeursImpliques"].as_str().unwrap_or(""),
            recommandation["InstanceValidation"].as_str().unwrap_or(""),
            recommandation["Echeance"].as_str().unwrap_or(""),
            recommandation["Domaine"].as_str().unwrap_or(""),
            recommandation["RecommandationID"].as_i64().unwrap_or(0),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_recommandation(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM Recommandation WHERE RecommandationID=?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn update_suivi_recommandation(state: tauri::State<AppState>, suivi: Value) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Vérifier si le suivi existe déjà
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM SuiviRecommandation WHERE RecommandationID=?1)",
            [suivi["RecommandationID"].as_i64().unwrap_or(0)],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if exists {
        conn.execute(
            "UPDATE SuiviRecommandation SET MesuresCorrectives=?1, DateDebut=?2, DateFin=?3,
             NiveauMiseEnOeuvre=?4, ObservationDelai=?5, ObservationMiseEnOeuvre=?6,
             AppreciationControle=?7, ReferenceJustificatif=?8
             WHERE RecommandationID=?9",
            params![
                suivi["MesuresCorrectives"].as_str().unwrap_or(""),
                suivi["DateDebut"].as_str().unwrap_or(""),
                suivi["DateFin"].as_str().unwrap_or(""),
                suivi["NiveauMiseEnOeuvre"]
                    .as_str()
                    .unwrap_or("Non commencé"),
                suivi["ObservationDelai"].as_str().unwrap_or(""),
                suivi["ObservationMiseEnOeuvre"].as_str().unwrap_or(""),
                suivi["AppreciationControle"].as_str().unwrap_or(""),
                suivi["ReferenceJustificatif"].as_str().unwrap_or(""),
                suivi["RecommandationID"].as_i64().unwrap_or(0),
            ],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO SuiviRecommandation (RecommandationID, MesuresCorrectives, DateDebut, DateFin,
             NiveauMiseEnOeuvre, ObservationDelai, ObservationMiseEnOeuvre, AppreciationControle, ReferenceJustificatif)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                suivi["RecommandationID"].as_i64().unwrap_or(0),
                suivi["MesuresCorrectives"].as_str().unwrap_or(""),
                suivi["DateDebut"].as_str().unwrap_or(""),
                suivi["DateFin"].as_str().unwrap_or(""),
                suivi["NiveauMiseEnOeuvre"].as_str().unwrap_or("Non commencé"),
                suivi["ObservationDelai"].as_str().unwrap_or(""),
                suivi["ObservationMiseEnOeuvre"].as_str().unwrap_or(""),
                suivi["AppreciationControle"].as_str().unwrap_or(""),
                suivi["ReferenceJustificatif"].as_str().unwrap_or(""),
            ],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ==================== COMMANDES STATISTIQUES ====================
#[tauri::command]
fn get_statistiques(state: tauri::State<AppState>) -> Result<Value, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let total_agents: i64 = conn
        .query_row("SELECT COUNT(*) FROM Agent", [], |row| row.get(0))
        .unwrap_or(0);
    let total_rapports: i64 = conn
        .query_row("SELECT COUNT(*) FROM Rapport", [], |row| row.get(0))
        .unwrap_or(0);
    let total_recommandations: i64 = conn
        .query_row("SELECT COUNT(*) FROM Recommandation", [], |row| row.get(0))
        .unwrap_or(0);
    let total_dossiers: i64 = conn
        .query_row("SELECT COUNT(*) FROM Dossier", [], |row| row.get(0))
        .unwrap_or(0);

    let recommandations_realisees: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM SuiviRecommandation WHERE NiveauMiseEnOeuvre = 'Réalisée'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let recommandations_en_cours: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM SuiviRecommandation WHERE NiveauMiseEnOeuvre = 'En cours'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(serde_json::json!({
        "totalAgents": total_agents,
        "totalRapports": total_rapports,
        "totalRecommandations": total_recommandations,
        "totalDossiers": total_dossiers,
        "recommandationsRealisees": recommandations_realisees,
        "recommandationsEnCours": recommandations_en_cours,
        "recommandationsNonRealisees": total_recommandations - recommandations_realisees - recommandations_en_cours,
    }))
}

// ==================== COMMANDES GRADES ====================
#[tauri::command]
fn get_grades(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT GradeID, LibelleGrade FROM Grade ORDER BY Ordre")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "GradeID": row.get::<_, i64>(0)?,
                "LibelleGrade": row.get::<_, String>(1)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn create_grade(state: tauri::State<AppState>, libelle: String, ordre: i64) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO Grade (LibelleGrade, Ordre) VALUES (?1, ?2)",
        params![libelle, ordre],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_grade(
    state: tauri::State<AppState>,
    grade_id: i64,
    libelle: String,
    ordre: i64,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE Grade SET LibelleGrade=?1, Ordre=?2 WHERE GradeID=?3",
        params![libelle, ordre, grade_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_grade(state: tauri::State<AppState>, grade_id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM Grade WHERE GradeID=?1", params![grade_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== COMMANDES SANCTIONS ====================
#[tauri::command]
fn get_sanctions(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT SanctionID, LibelleSanction, Niveau FROM Sanction ORDER BY Niveau")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "SanctionID": row.get::<_, i64>(0)?,
                "LibelleSanction": row.get::<_, String>(1)?,
                "Niveau": row.get::<_, Option<i64>>(2)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn create_sanction(
    state: tauri::State<AppState>,
    libelle: String,
    niveau: i64,
) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO Sanction (LibelleSanction, Niveau) VALUES (?1, ?2)",
        params![libelle, niveau],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_sanction(
    state: tauri::State<AppState>,
    sanction_id: i64,
    libelle: String,
    niveau: i64,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE Sanction SET LibelleSanction=?1, Niveau=?2 WHERE SanctionID=?3",
        params![libelle, niveau, sanction_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_sanction(state: tauri::State<AppState>, sanction_id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM Sanction WHERE SanctionID=?1",
        params![sanction_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== COMMANDES SERVICES INVESTIGATION ====================
#[tauri::command]
fn get_services_investigation(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT ServiceID, LibelleService, Acronyme FROM ServiceInvestigation WHERE Actif = 1 ORDER BY Ordre"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "ServiceID": row.get::<_, i64>(0)?,
                "LibelleService": row.get::<_, String>(1)?,
                "Acronyme": row.get::<_, Option<String>>(2)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn get_all_services_investigation(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT ServiceID, LibelleService, Acronyme, Ordre, Actif FROM ServiceInvestigation ORDER BY Ordre"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "ServiceID": row.get::<_, i64>(0)?,
                "LibelleService": row.get::<_, String>(1)?,
                "Acronyme": row.get::<_, Option<String>>(2)?,
                "Ordre": row.get::<_, i64>(3)?,
                "Actif": row.get::<_, i64>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn create_service_investigation(
    state: tauri::State<AppState>,
    libelle: String,
    acronyme: String,
    ordre: i64,
) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO ServiceInvestigation (LibelleService, Acronyme, Ordre, Actif) VALUES (?1, ?2, ?3, 1)",
        params![libelle, acronyme, ordre],
    ).map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_service_investigation(
    state: tauri::State<AppState>,
    service_id: i64,
    libelle: String,
    acronyme: String,
    ordre: i64,
    actif: i64,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE ServiceInvestigation SET LibelleService=?1, Acronyme=?2, Ordre=?3, Actif=?4 WHERE ServiceID=?5",
        params![libelle, acronyme, ordre, actif, service_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_service_investigation(
    state: tauri::State<AppState>,
    service_id: i64,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE ServiceInvestigation SET Actif = 0 WHERE ServiceID=?1",
        params![service_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== COMMANDES SIGNATAIRES ====================
#[tauri::command]
fn get_signataires(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT SignataireID, Nom, Prenom, Grade, Fonction, TitreHonorifique, Statut, Ordre 
         FROM Signataire 
         WHERE Statut = 1 
         ORDER BY Ordre, Nom",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "SignataireID": row.get::<_, i64>(0)?,
                "Nom": row.get::<_, String>(1)?,
                "Prenom": row.get::<_, String>(2)?,
                "Grade": row.get::<_, Option<String>>(3)?,
                "Fonction": row.get::<_, String>(4)?,
                "TitreHonorifique": row.get::<_, Option<String>>(5)?,
                "Statut": row.get::<_, i64>(6)?,
                "Ordre": row.get::<_, Option<i64>>(7)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn get_all_signataires(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT SignataireID, Nom, Prenom, Grade, Fonction, TitreHonorifique, Statut, Ordre 
         FROM Signataire 
         ORDER BY Statut DESC, Ordre, Nom",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "SignataireID": row.get::<_, i64>(0)?,
                "Nom": row.get::<_, String>(1)?,
                "Prenom": row.get::<_, String>(2)?,
                "Grade": row.get::<_, Option<String>>(3)?,
                "Fonction": row.get::<_, String>(4)?,
                "TitreHonorifique": row.get::<_, Option<String>>(5)?,
                "Statut": row.get::<_, i64>(6)?,
                "Ordre": row.get::<_, Option<i64>>(7)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn get_signataires_actifs(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT SignataireID, Nom, Prenom, Grade, Fonction, TitreHonorifique 
         FROM Signataire 
         WHERE Statut = 1 
         ORDER BY Ordre, Nom",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "SignataireID": row.get::<_, i64>(0)?,
                "Nom": row.get::<_, String>(1)?,
                "Prenom": row.get::<_, String>(2)?,
                "Grade": row.get::<_, Option<String>>(3)?,
                "Fonction": row.get::<_, String>(4)?,
                "TitreHonorifique": row.get::<_, Option<String>>(5)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn create_signataire(state: tauri::State<AppState>, signataire: Value) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let max_ordre: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(Ordre), 0) + 1 FROM Signataire",
            [],
            |row| row.get(0),
        )
        .unwrap_or(1);

    conn.execute(
        "INSERT INTO Signataire (Nom, Prenom, Grade, Fonction, TitreHonorifique, Statut, Ordre, UpdatedAt) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))",
        params![
            signataire["Nom"].as_str().unwrap_or(""),
            signataire["Prenom"].as_str().unwrap_or(""),
            signataire["Grade"].as_str().unwrap_or(""),
            signataire["Fonction"].as_str().unwrap_or(""),
            signataire["TitreHonorifique"].as_str().unwrap_or(""),
            signataire["Statut"].as_i64().unwrap_or(1),
            max_ordre,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn update_signataire(state: tauri::State<AppState>, signataire: Value) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE Signataire SET 
         Nom = ?1, 
         Prenom = ?2, 
         Grade = ?3, 
         Fonction = ?4, 
         TitreHonorifique = ?5, 
         Statut = ?6,
         UpdatedAt = datetime('now')
         WHERE SignataireID = ?7",
        params![
            signataire["Nom"].as_str().unwrap_or(""),
            signataire["Prenom"].as_str().unwrap_or(""),
            signataire["Grade"].as_str().unwrap_or(""),
            signataire["Fonction"].as_str().unwrap_or(""),
            signataire["TitreHonorifique"].as_str().unwrap_or(""),
            signataire["Statut"].as_i64().unwrap_or(1),
            signataire["SignataireID"].as_i64().unwrap_or(0),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn delete_signataire(state: tauri::State<AppState>, signataire_id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE Signataire SET Statut = 0, UpdatedAt = datetime('now') WHERE SignataireID = ?1",
        [signataire_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn move_signataire_up(state: tauri::State<AppState>, signataire_id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let current_ordre: i64 = match conn.query_row(
        "SELECT Ordre FROM Signataire WHERE SignataireID = ?1 AND Statut = 1",
        [signataire_id],
        |row| row.get(0),
    ) {
        Ok(ordre) => ordre,
        Err(e) => return Err(e.to_string()),
    };

    if current_ordre <= 1 {
        return Ok(());
    }

    let prev_id: Result<i64, rusqlite::Error> = conn.query_row(
        "SELECT SignataireID FROM Signataire WHERE Ordre = ?1 AND Statut = 1",
        [current_ordre - 1],
        |row| row.get(0),
    );

    if let Ok(prev_id) = prev_id {
        let _ = conn
            .execute(
                "UPDATE Signataire SET Ordre = ?1 WHERE SignataireID = ?2",
                [current_ordre - 1, signataire_id],
            )
            .map_err(|e| e.to_string())?;
        let _ = conn
            .execute(
                "UPDATE Signataire SET Ordre = ?1 WHERE SignataireID = ?2",
                [current_ordre, prev_id],
            )
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn move_signataire_down(state: tauri::State<AppState>, signataire_id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let current_ordre: i64 = match conn.query_row(
        "SELECT Ordre FROM Signataire WHERE SignataireID = ?1 AND Statut = 1",
        [signataire_id],
        |row| row.get(0),
    ) {
        Ok(ordre) => ordre,
        Err(e) => return Err(e.to_string()),
    };

    let max_ordre: i64 = match conn.query_row(
        "SELECT COALESCE(MAX(Ordre), 0) FROM Signataire WHERE Statut = 1",
        [],
        |row| row.get(0),
    ) {
        Ok(max) => max,
        Err(e) => return Err(e.to_string()),
    };

    if current_ordre >= max_ordre {
        return Ok(());
    }

    let next_id: Result<i64, rusqlite::Error> = conn.query_row(
        "SELECT SignataireID FROM Signataire WHERE Ordre = ?1 AND Statut = 1",
        [current_ordre + 1],
        |row| row.get(0),
    );

    if let Ok(next_id) = next_id {
        let _ = conn
            .execute(
                "UPDATE Signataire SET Ordre = ?1 WHERE SignataireID = ?2",
                [current_ordre + 1, signataire_id],
            )
            .map_err(|e| e.to_string())?;
        let _ = conn
            .execute(
                "UPDATE Signataire SET Ordre = ?1 WHERE SignataireID = ?2",
                [current_ordre, next_id],
            )
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ==================== COMMANDES POUR EXPORT ====================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db = init_db().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState { db: Mutex::new(db) })
        .invoke_handler(tauri::generate_handler![
            // Agents
            create_agent,
            get_agents,
            update_agent,
            delete_agent,
            // Rapports
            create_rapport,
            get_rapports,
            update_rapport,
            delete_rapport,
            get_rapports_list,
            // Dossiers
            create_dossier,
            get_dossiers,
            update_dossier,
            delete_dossier,
            // Recommandations
            create_recommandation,
            get_recommandations,
            update_recommandation,
            delete_recommandation,
            update_suivi_recommandation,
            // Statistiques
            get_statistiques,
            // Grades
            get_grades,
            create_grade,
            update_grade,
            delete_grade,
            // Sanctions
            get_sanctions,
            create_sanction,
            update_sanction,
            delete_sanction,
            // Services Investigation
            get_services_investigation,
            get_all_services_investigation,
            create_service_investigation,
            update_service_investigation,
            delete_service_investigation,
            // Signataires
            get_signataires,
            get_all_signataires,
            get_signataires_actifs,
            create_signataire,
            update_signataire,
            delete_signataire,
            move_signataire_up,
            move_signataire_down,
            // Paramètres Généraux
            get_parametres_generaux,
            create_parametre_general,
            update_parametre_general,
            delete_parametre_general,
            // Entête Document
            get_entete_document,
            create_entete_document,
            update_entete_document,
            delete_entete_document,
            get_all_entete_documents,
            // Logs
            get_logs,
            get_logs_with_users,
            log_action,
            // Config Entête (ancien)
            get_entete_config,
            // Commandes d'authentification
            login,
            logout,
            verify_session,
            change_password,
            create_user,
            get_users,
            update_user_status,
            delete_user,
            get_distinct_domaines,
            get_distinct_domaines,
            // add_domaine,  // ← SUPPRIMEZ CETTE LIGNE
        ])
        .run(generate_context!())
        .expect("error while running tauri application");
}
// ==================== COMMANDES LOGS ====================
#[tauri::command]
fn get_logs(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT * FROM Logs ORDER BY DateLog DESC LIMIT 100")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "LogID": row.get::<_, i64>(0)?,
                "Utilisateur": row.get::<_, Option<String>>(1)?,
                "Action": row.get::<_, Option<String>>(2)?,
                "TableConcernee": row.get::<_, Option<String>>(3)?,
                "EnregistrementID": row.get::<_, Option<i64>>(4)?,
                "DateLog": row.get::<_, Option<String>>(5)?,
                "Details": row.get::<_, Option<String>>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

// ==================== COMMANDES CONFIG ENTETE ====================
#[tauri::command]
fn get_entete_config(
    state: tauri::State<AppState>,
    composant: String,
) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT * FROM EnteteConfig WHERE Composant = ?1 AND Actif = 1 ORDER BY Ordre")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![composant], |row| {
            Ok(serde_json::json!({
                "ConfigID": row.get::<_, i64>(0)?,
                "Composant": row.get::<_, String>(1)?,
                "Champ": row.get::<_, String>(2)?,
                "Valeur": row.get::<_, Option<String>>(3)?,
                "Ordre": row.get::<_, i64>(4)?,
                "Actif": row.get::<_, i64>(5)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn get_rapports_list(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT RapportID, NumeroRapport, LibelleRapport, DateRapport FROM Rapport ORDER BY DateRapport DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "RapportID": row.get::<_, i64>(0)?,
                "NumeroRapport": row.get::<_, String>(1)?,
                "LibelleRapport": row.get::<_, String>(2)?,
                "DateRapport": row.get::<_, String>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn get_distinct_domaines(state: tauri::State<AppState>) -> Result<Vec<String>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT DISTINCT Domaine FROM Recommandation WHERE Domaine IS NOT NULL AND Domaine != '' ORDER BY Domaine"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

// ==================== COMMANDES ENTÊTE DOCUMENT ====================

#[tauri::command]
fn get_entete_document(
    state: tauri::State<AppState>,
    type_document: String,
) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT EnteteID, TypeDocument, Champ, Valeur, Ordre, Actif, Style 
         FROM EnteteDocument 
         WHERE TypeDocument = ?1 AND Actif = 1 
         ORDER BY Ordre",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([type_document], |row| {
            Ok(serde_json::json!({
                "EnteteID": row.get::<_, i64>(0)?,
                "TypeDocument": row.get::<_, String>(1)?,
                "Champ": row.get::<_, String>(2)?,
                "Valeur": row.get::<_, String>(3)?,
                "Ordre": row.get::<_, i64>(4)?,
                "Actif": row.get::<_, i64>(5)?,
                "Style": row.get::<_, Option<String>>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn create_entete_document(
    state: tauri::State<AppState>,
    type_document: String,
    champ: String,
    valeur: String,
    ordre: i64,
    style: Option<String>,
) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Vérifier si le champ existe déjà
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM EnteteDocument WHERE TypeDocument = ?1 AND Champ = ?2)",
            params![&type_document, &champ],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if exists {
        // Mettre à jour au lieu de créer
        conn.execute(
            "UPDATE EnteteDocument SET Valeur = ?1, Ordre = ?2, Style = ?3, UpdatedAt = datetime('now')
             WHERE TypeDocument = ?4 AND Champ = ?5",
            params![valeur, ordre, style, type_document, champ],
        ).map_err(|e| e.to_string())?;

        // Récupérer l'ID existant
        let id: i64 = conn
            .query_row(
                "SELECT EnteteID FROM EnteteDocument WHERE TypeDocument = ?1 AND Champ = ?2",
                params![type_document, champ],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        return Ok(id);
    }

    // Sinon, créer un nouveau
    conn.execute(
        "INSERT INTO EnteteDocument (TypeDocument, Champ, Valeur, Ordre, Style) 
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![type_document, champ, valeur, ordre, style],
    )
    .map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    // Log l'action
    let _ = conn.execute(
        "INSERT INTO Logs (Utilisateur, Action, TableConcernee, EnregistrementID, Details) 
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            "Admin",
            "CREATE",
            "EnteteDocument",
            id,
            format!("Création du champ: {}", champ)
        ],
    );

    Ok(id)
}
#[tauri::command]
fn update_entete_document(
    state: tauri::State<AppState>,
    entete_id: i64,
    valeur: String,
    ordre: i64,
    actif: i64,
    style: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Récupérer l'ancienne valeur pour le log
    let ancienne_valeur: Result<String, rusqlite::Error> = conn.query_row(
        "SELECT Valeur FROM EnteteDocument WHERE EnteteID = ?1",
        [entete_id],
        |row| row.get(0),
    );

    conn.execute(
        "UPDATE EnteteDocument SET Valeur = ?1, Ordre = ?2, Actif = ?3, Style = ?4, UpdatedAt = datetime('now')
         WHERE EnteteID = ?5",
        params![valeur, ordre, actif, style, entete_id],
    ).map_err(|e| e.to_string())?;

    // Log l'action
    if let Ok(old_val) = ancienne_valeur {
        let _ = conn.execute(
            "INSERT INTO Logs (Utilisateur, Action, TableConcernee, EnregistrementID, AnciennesValeurs, NouvellesValeurs, Details) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                "Admin", 
                "UPDATE", 
                "EnteteDocument", 
                entete_id,
                old_val,
                valeur,
                format!("Modification du champ ID: {}", entete_id)
            ],
        );
    }

    Ok(())
}

#[tauri::command]
fn delete_entete_document(state: tauri::State<AppState>, entete_id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Récupérer les infos pour le log
    let champ_info: Result<(String, String), rusqlite::Error> = conn.query_row(
        "SELECT Champ, TypeDocument FROM EnteteDocument WHERE EnteteID = ?1",
        [entete_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    );

    conn.execute(
        "DELETE FROM EnteteDocument WHERE EnteteID = ?1",
        params![entete_id],
    )
    .map_err(|e| e.to_string())?;

    // Log l'action
    if let Ok((champ, type_doc)) = champ_info {
        let _ = conn.execute(
            "INSERT INTO Logs (Utilisateur, Action, TableConcernee, EnregistrementID, Details) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                "Admin",
                "DELETE",
                "EnteteDocument",
                entete_id,
                format!(
                    "Suppression du champ '{}' du document '{}'",
                    champ, type_doc
                )
            ],
        );
    }

    Ok(())
}

#[tauri::command]
fn get_all_entete_documents(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT EnteteID, TypeDocument, Champ, Valeur, Ordre, Actif, Style 
         FROM EnteteDocument 
         ORDER BY TypeDocument, Ordre",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "EnteteID": row.get::<_, i64>(0)?,
                "TypeDocument": row.get::<_, String>(1)?,
                "Champ": row.get::<_, String>(2)?,
                "Valeur": row.get::<_, String>(3)?,
                "Ordre": row.get::<_, i64>(4)?,
                "Actif": row.get::<_, i64>(5)?,
                "Style": row.get::<_, Option<String>>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

// ==================== COMMANDES LOGS ====================

// ==================== COMMANDES PARAMÈTRES GÉNÉRAUX ====================

#[tauri::command]
fn get_logs_with_users(
    state: tauri::State<AppState>,
    limit: Option<i64>,
) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let limit_val = limit.unwrap_or(200);

    let mut stmt = conn
        .prepare(
            "SELECT LogID, Utilisateur, Action, TableConcernee, EnregistrementID, 
                AnciennesValeurs, NouvellesValeurs, AdresseIP, DateLog, Details 
         FROM Logs 
         ORDER BY DateLog DESC 
         LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([limit_val], |row| {
            Ok(serde_json::json!({
                "LogID": row.get::<_, i64>(0)?,
                "Utilisateur": row.get::<_, String>(1)?,
                "Action": row.get::<_, String>(2)?,
                "TableConcernee": row.get::<_, String>(3)?,
                "EnregistrementID": row.get::<_, Option<i64>>(4)?,
                "AnciennesValeurs": row.get::<_, Option<String>>(5)?,
                "NouvellesValeurs": row.get::<_, Option<String>>(6)?,
                "AdresseIP": row.get::<_, Option<String>>(7)?,
                "DateLog": row.get::<_, String>(8)?,
                "Details": row.get::<_, Option<String>>(9)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn log_action(
    state: tauri::State<AppState>,
    utilisateur: String,
    action: String,
    table_concernee: String,
    enregistrement_id: Option<i64>,
    anciennes_valeurs: Option<String>,
    nouvelles_valeurs: Option<String>,
    details: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO Logs (Utilisateur, Action, TableConcernee, EnregistrementID, AnciennesValeurs, NouvellesValeurs, Details) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            utilisateur,
            action,
            table_concernee,
            enregistrement_id,
            anciennes_valeurs,
            nouvelles_valeurs,
            details,
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}
// ==================== COMMANDES PARAMÈTRES GÉNÉRAUX (CRUD COMPLET) ====================

#[tauri::command]
fn get_parametres_generaux(state: tauri::State<AppState>) -> Result<Vec<Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT ParametreID, Code, Valeur, Description, UpdatedAt, UpdatedBy 
         FROM ParametresGeneraux 
         ORDER BY Code",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "ParametreID": row.get::<_, i64>(0)?,
                "Code": row.get::<_, String>(1)?,
                "Valeur": row.get::<_, String>(2)?,
                "Description": row.get::<_, Option<String>>(3)?,
                "UpdatedAt": row.get::<_, String>(4)?,
                "UpdatedBy": row.get::<_, Option<String>>(5)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn create_parametre_general(
    state: tauri::State<AppState>,
    code: String,
    valeur: String,
    description: Option<String>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Vérifier si le paramètre existe déjà
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM ParametresGeneraux WHERE Code = ?1)",
            [&code],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if exists {
        return Err(format!("Le paramètre '{}' existe déjà", code));
    }

    conn.execute(
        "INSERT INTO ParametresGeneraux (Code, Valeur, Description, UpdatedBy) 
         VALUES (?1, ?2, ?3, 'Admin')",
        params![code, valeur, description],
    )
    .map_err(|e| e.to_string())?;

    // Log l'action
    let _ = conn.execute(
        "INSERT INTO Logs (Utilisateur, Action, TableConcernee, Details) 
         VALUES (?1, ?2, ?3, ?4)",
        params![
            "Admin",
            "CREATE",
            "ParametresGeneraux",
            format!("Création du paramètre: {}", code)
        ],
    );

    Ok(())
}

#[tauri::command]
fn update_parametre_general(
    state: tauri::State<AppState>,
    code: String,
    valeur: String,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Récupérer l'ancienne valeur pour le log
    let ancienne_valeur: Result<String, rusqlite::Error> = conn.query_row(
        "SELECT Valeur FROM ParametresGeneraux WHERE Code = ?1",
        [&code],
        |row| row.get(0),
    );

    conn.execute(
        "UPDATE ParametresGeneraux SET Valeur = ?1, UpdatedAt = datetime('now'), UpdatedBy = 'Admin'
         WHERE Code = ?2",
        params![valeur, code],
    ).map_err(|e| e.to_string())?;

    // Log l'action
    if let Ok(old_val) = ancienne_valeur {
        let _ = conn.execute(
            "INSERT INTO Logs (Utilisateur, Action, TableConcernee, Details, AnciennesValeurs, NouvellesValeurs) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                "Admin",
                "UPDATE",
                "ParametresGeneraux",
                format!("Modification du paramètre: {}", code),
                old_val,
                valeur
            ],
        );
    }

    Ok(())
}

#[tauri::command]
fn delete_parametre_general(state: tauri::State<AppState>, code: String) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Récupérer la valeur pour le log
    let valeur: Result<String, rusqlite::Error> = conn.query_row(
        "SELECT Valeur FROM ParametresGeneraux WHERE Code = ?1",
        [&code],
        |row| row.get(0),
    );

    conn.execute(
        "DELETE FROM ParametresGeneraux WHERE Code = ?1",
        params![code],
    )
    .map_err(|e| e.to_string())?;

    // Log l'action
    if let Ok(val) = valeur {
        let _ = conn.execute(
            "INSERT INTO Logs (Utilisateur, Action, TableConcernee, Details, AnciennesValeurs) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                "Admin",
                "DELETE",
                "ParametresGeneraux",
                format!("Suppression du paramètre: {}", code),
                val
            ],
        );
    }

    Ok(())
}

// ==================== COMMANDES D'AUTHENTIFICATION ====================

use bcrypt::{hash, verify, DEFAULT_COST};
use rand::Rng;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(serde::Serialize)]
struct AuthResponse {
    success: bool,
    token: Option<String>,
    user: Option<serde_json::Value>,
    message: String,
}

#[derive(serde::Serialize)]
struct UserInfo {
    id: i64,
    nom_utilisateur: String,
    email: String,
    nom: Option<String>,
    prenom: Option<String>,
    role: String,
    permissions: Vec<String>,
}

#[tauri::command]
fn login(
    state: tauri::State<AppState>,
    email: String,
    password: String,
    adresse_ip: Option<String>,
) -> Result<AuthResponse, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Rechercher l'utilisateur par email
    let user = conn.query_row(
        "SELECT UtilisateurID, NomUtilisateur, Email, MotDePasse, Nom, Prenom, Role, Statut, TentativesConnexion 
         FROM Utilisateur WHERE Email = ?1 AND Statut = 1",
        [&email],
        |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, i64>(7)?,
                row.get::<_, i64>(8)?,
            ))
        },
    );

    match user {
        Ok((
            user_id,
            nom_utilisateur,
            user_email,
            hashed_password,
            nom,
            prenom,
            role,
            _statut,
            tentatives,
        )) => {
            // Vérifier si le compte est bloqué (5 tentatives)
            if tentatives >= 5 {
                return Ok(AuthResponse {
                    success: false,
                    token: None,
                    user: None,
                    message: "Compte bloqué. Veuillez contacter l'administrateur.".to_string(),
                });
            }

            // Vérifier le mot de passe
            match verify(&password, &hashed_password) {
                Ok(true) => {
                    // Générer un token
                    let token: String = rand::thread_rng()
                        .sample_iter(&rand::distributions::Alphanumeric)
                        .take(64)
                        .map(char::from)
                        .collect();

                    let now = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs();
                    let expiration = now + 86400; // 24 heures

                    // Sauvegarder la session
                    conn.execute(
                        "INSERT INTO Session (Token, UtilisateurID, DateExpiration, AdresseIP, Actif) 
                         VALUES (?1, ?2, ?3, ?4, 1)",
                        params![&token, user_id, expiration, adresse_ip],
                    ).map_err(|e| e.to_string())?;

                    // Mettre à jour la dernière connexion et réinitialiser les tentatives
                    conn.execute(
                        "UPDATE Utilisateur SET DerniereConnexion = datetime('now'), TentativesConnexion = 0 
                         WHERE UtilisateurID = ?1",
                        [user_id],
                    ).map_err(|e| e.to_string())?;

                    // Récupérer les permissions
                    let permissions: Vec<String> = {
                        let mut stmt = conn
                            .prepare(
                                "SELECT p.Code FROM Permission p
                             JOIN RolePermission rp ON p.PermissionID = rp.PermissionID
                             WHERE rp.Role = ?1",
                            )
                            .map_err(|e| e.to_string())?;
                        let rows = stmt
                            .query_map([&role], |row| row.get(0))
                            .map_err(|e| e.to_string())?;
                        let mut perms = Vec::new();
                        for row in rows {
                            perms.push(row.map_err(|e| e.to_string())?);
                        }
                        perms
                    };

                    let user_info = UserInfo {
                        id: user_id,
                        nom_utilisateur,
                        email: user_email,
                        nom,
                        prenom,
                        role,
                        permissions,
                    };

                    Ok(AuthResponse {
                        success: true,
                        token: Some(token),
                        user: Some(serde_json::to_value(&user_info).unwrap()),
                        message: "Connexion réussie".to_string(),
                    })
                }
                Ok(false) => {
                    // Incrémenter les tentatives
                    conn.execute(
                        "UPDATE Utilisateur SET TentativesConnexion = TentativesConnexion + 1 
                         WHERE UtilisateurID = ?1",
                        [user_id],
                    )
                    .map_err(|e| e.to_string())?;

                    let remaining = 4 - tentatives;
                    Ok(AuthResponse {
                        success: false,
                        token: None,
                        user: None,
                        message: format!(
                            "Mot de passe incorrect. Plus que {} tentatives.",
                            remaining
                        ),
                    })
                }
                Err(e) => Err(e.to_string()),
            }
        }
        Err(_) => Ok(AuthResponse {
            success: false,
            token: None,
            user: None,
            message: "Email ou mot de passe incorrect".to_string(),
        }),
    }
}

#[tauri::command]
fn logout(state: tauri::State<AppState>, token: String) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE Session SET Actif = 0 WHERE Token = ?1", [token])
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn verify_session(
    state: tauri::State<AppState>,
    token: String,
) -> Result<Option<UserInfo>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let result = conn.query_row(
        "SELECT u.UtilisateurID, u.NomUtilisateur, u.Email, u.Nom, u.Prenom, u.Role, s.Actif
         FROM Session s
         JOIN Utilisateur u ON s.UtilisateurID = u.UtilisateurID
         WHERE s.Token = ?1 AND s.Actif = 1 AND s.DateExpiration > ?2 AND u.Statut = 1",
        params![token, now],
        |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, String>(5)?,
            ))
        },
    );

    match result {
        Ok((user_id, nom_utilisateur, email, nom, prenom, role)) => {
            let permissions: Vec<String> = {
                let mut stmt = conn
                    .prepare(
                        "SELECT p.Code FROM Permission p
                     JOIN RolePermission rp ON p.PermissionID = rp.PermissionID
                     WHERE rp.Role = ?1",
                    )
                    .map_err(|e| e.to_string())?;
                let rows = stmt
                    .query_map([&role], |row| row.get(0))
                    .map_err(|e| e.to_string())?;
                let mut perms = Vec::new();
                for row in rows {
                    perms.push(row.map_err(|e| e.to_string())?);
                }
                perms
            };

            Ok(Some(UserInfo {
                id: user_id,
                nom_utilisateur,
                email,
                nom,
                prenom,
                role,
                permissions,
            }))
        }
        Err(_) => Ok(None),
    }
}

#[tauri::command]
fn change_password(
    state: tauri::State<AppState>,
    token: String,
    old_password: String,
    new_password: String,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Récupérer l'utilisateur
    let user_id: i64 = conn
        .query_row(
            "SELECT UtilisateurID FROM Session WHERE Token = ?1 AND Actif = 1",
            [&token],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let hashed_password: String = conn
        .query_row(
            "SELECT MotDePasse FROM Utilisateur WHERE UtilisateurID = ?1",
            [user_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Vérifier l'ancien mot de passe
    if !verify(&old_password, &hashed_password).map_err(|e| e.to_string())? {
        return Err("Ancien mot de passe incorrect".to_string());
    }

    // Hasher le nouveau mot de passe
    let new_hashed = hash(&new_password, DEFAULT_COST).map_err(|e| e.to_string())?;

    // Mettre à jour
    conn.execute(
        "UPDATE Utilisateur SET MotDePasse = ?1, DateModification = datetime('now') WHERE UtilisateurID = ?2",
        params![new_hashed, user_id],
    ).map_err(|e| e.to_string())?;

    Ok(true)
}

#[tauri::command]
fn create_user(
    state: tauri::State<AppState>,
    token: String,
    nom_utilisateur: String,
    email: String,
    password: String,
    nom: Option<String>,
    prenom: Option<String>,
    role: String,
) -> Result<i64, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Vérifier les droits admin
    let user_role: String = conn
        .query_row(
            "SELECT u.Role FROM Session s JOIN Utilisateur u ON s.UtilisateurID = u.UtilisateurID 
         WHERE s.Token = ?1 AND s.Actif = 1",
            [&token],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if user_role != "admin" {
        return Err("Droits insuffisants".to_string());
    }

    let hashed_password = hash(&password, DEFAULT_COST).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO Utilisateur (NomUtilisateur, Email, MotDePasse, Nom, Prenom, Role, Statut) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)",
        params![nom_utilisateur, email, hashed_password, nom, prenom, role],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn get_users(
    state: tauri::State<AppState>,
    token: String,
) -> Result<Vec<serde_json::Value>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Vérifier les droits admin
    let user_role: String = conn
        .query_row(
            "SELECT u.Role FROM Session s JOIN Utilisateur u ON s.UtilisateurID = u.UtilisateurID 
         WHERE s.Token = ?1 AND s.Actif = 1",
            [&token],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if user_role != "admin" {
        return Err("Droits insuffisants".to_string());
    }

    let mut stmt = conn
        .prepare(
            "SELECT UtilisateurID, NomUtilisateur, Email, Nom, Prenom, Role, Statut, 
         TentativesConnexion, DerniereConnexion, DateCreation 
         FROM Utilisateur ORDER BY DateCreation DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "UtilisateurID": row.get::<_, i64>(0)?,
                "NomUtilisateur": row.get::<_, String>(1)?,
                "Email": row.get::<_, String>(2)?,
                "Nom": row.get::<_, Option<String>>(3)?,
                "Prenom": row.get::<_, Option<String>>(4)?,
                "Role": row.get::<_, String>(5)?,
                "Statut": row.get::<_, i64>(6)?,
                "TentativesConnexion": row.get::<_, i64>(7)?,
                "DerniereConnexion": row.get::<_, Option<String>>(8)?,
                "DateCreation": row.get::<_, String>(9)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }
    Ok(result)
}

#[tauri::command]
fn update_user_status(
    state: tauri::State<AppState>,
    token: String,
    user_id: i64,
    statut: i64,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Vérifier les droits admin
    let user_role: String = conn
        .query_row(
            "SELECT u.Role FROM Session s JOIN Utilisateur u ON s.UtilisateurID = u.UtilisateurID 
         WHERE s.Token = ?1 AND s.Actif = 1",
            [&token],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if user_role != "admin" {
        return Err("Droits insuffisants".to_string());
    }

    conn.execute(
        "UPDATE Utilisateur SET Statut = ?1, DateModification = datetime('now') WHERE UtilisateurID = ?2",
        params![statut, user_id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn delete_user(state: tauri::State<AppState>, token: String, user_id: i64) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Vérifier les droits admin
    let user_role: String = conn
        .query_row(
            "SELECT u.Role FROM Session s JOIN Utilisateur u ON s.UtilisateurID = u.UtilisateurID 
         WHERE s.Token = ?1 AND s.Actif = 1",
            [&token],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if user_role != "admin" {
        return Err("Droits insuffisants".to_string());
    }

    // Ne pas supprimer l'admin principal
    let is_admin: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM Utilisateur WHERE UtilisateurID = ?1 AND Role = 'admin'",
            [user_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if is_admin > 0 {
        return Err("Impossible de supprimer le compte administrateur principal".to_string());
    }

    conn.execute(
        "DELETE FROM Utilisateur WHERE UtilisateurID = ?1",
        [user_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
// ==================== POINT D'ENTRÉE PRINCIPAL ====================
fn main() {
    run();
}
