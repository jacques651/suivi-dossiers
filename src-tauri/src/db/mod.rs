use tauri::command;
use rusqlite::{Connection, Result};
use std::sync::Mutex;

pub struct AppState {
    pub db: Mutex<Connection>,
}

// Initialisation de la base de données
pub fn init_db() -> Result<Connection> {
    let conn = Connection::open("bd_sdi.db")?;
    
    // Création des tables
    conn.execute_batch(
        "
        -- Table Agent
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
        
        -- Table Rapport
        CREATE TABLE IF NOT EXISTS Rapport (
            RapportID INTEGER PRIMARY KEY AUTOINCREMENT,
            LibelleRapport TEXT NOT NULL,
            NumeroRapport TEXT UNIQUE NOT NULL,
            DateRapport DATE NOT NULL,
            TypeInspection TEXT,
            PeriodeSousRevue TEXT,
            Fichier TEXT
        );
        
        -- Table Dossier
        CREATE TABLE IF NOT EXISTS Dossier (
            DossierID INTEGER PRIMARY KEY AUTOINCREMENT,
            PersonnelID INTEGER NOT NULL,
            TypeInconduite TEXT,
            PeriodeInconduite TEXT,
            Annee INTEGER,
            ServiceInvestigation TEXT,
            Etat TEXT,
            SuiteReservee TEXT,
            TypeSanction TEXT,
            Sanction TEXT,
            ActeSanction TEXT,
            NumeroActeSanction TEXT,
            AutoriteSanction TEXT,
            Observations TEXT,
            IDRapport INTEGER,
            FOREIGN KEY (PersonnelID) REFERENCES Agent(PersonnelID),
            FOREIGN KEY (IDRapport) REFERENCES Rapport(RapportID)
        );
        
        -- Table Recommandation
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
            Echeance DATE,
            Domaine TEXT,
            FOREIGN KEY (RapportID) REFERENCES Rapport(RapportID)
        );
        
        -- Table SuiviRecommandation
        CREATE TABLE IF NOT EXISTS SuiviRecommandation (
            SuiviID INTEGER PRIMARY KEY AUTOINCREMENT,
            RecommandationID INTEGER NOT NULL,
            MesuresCorrectives TEXT,
            DateDebut DATE,
            DateFin DATE,
            NiveauMiseEnOeuvre TEXT,
            ObservationDelai TEXT,
            ObservationMiseEnOeuvre TEXT,
            AppreciationControle TEXT,
            ReferenceJustificatif TEXT,
            FOREIGN KEY (RecommandationID) REFERENCES Recommandation(RecommandationID)
        );

        
        -- Index pour les performances
        CREATE INDEX IF NOT EXISTS idx_dossier_personnel ON Dossier(PersonnelID);
        CREATE INDEX IF NOT EXISTS idx_recommandation_rapport ON Recommandation(RapportID);
        CREATE INDEX IF NOT EXISTS idx_suivi_recommandation ON SuiviRecommandation(RecommandationID);
        "
    )?;
    
    Ok(conn)
}