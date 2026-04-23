-- =============================================================
-- SEO Dashboard – Full Database Schema
-- Engine: MySQL 8.0+
-- Run this file once to initialise the database structure.
-- NOTE: Import this file while already inside your target database
--       (e.g. select the DB in phpMyAdmin before importing).
--       Do NOT include CREATE DATABASE / USE statements on shared
--       hosting where the user lacks those privileges.
-- =============================================================

-- -------------------------------------------------------------
-- 1. USERS
--    Stores login credentials and role for every team member.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id           VARCHAR(64)  NOT NULL,
  name         VARCHAR(100) NOT NULL,
  password     VARCHAR(255) NOT NULL,           -- plain-text, internal tool only
  role         ENUM('admin','seo','content','web') NOT NULL DEFAULT 'seo',
  owner_name   VARCHAR(100) NOT NULL DEFAULT '',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_name (name)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 2. ADMIN_OPTIONS
--    Key-value list used to populate every dropdown in the UI.
--    option_type examples: clients, seoOwners, contentOwners,
--      webOwners, seoStages, seoQcStatuses, contentStatuses, webStatuses
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_options (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  option_type  VARCHAR(50)  NOT NULL,
  value        VARCHAR(255) NOT NULL,
  sort_order   INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_option_type_value (option_type, value)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 3. TASKS
--    Core work items tracked across SEO / Content / Web depts.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id                     VARCHAR(64)   NOT NULL,
  title                  VARCHAR(500)  NOT NULL DEFAULT '',
  client                 VARCHAR(200)  NOT NULL DEFAULT '',
  seo_owner              VARCHAR(100)  NOT NULL DEFAULT '',
  seo_stage              VARCHAR(100)  NOT NULL DEFAULT '',
  current_owner          VARCHAR(100)  NOT NULL DEFAULT 'SEO',
  is_completed           TINYINT(1)    NOT NULL DEFAULT 0,
  seo_qc_status          VARCHAR(100)  NOT NULL DEFAULT 'Pending',
  content_status         VARCHAR(100)  NOT NULL DEFAULT '',
  web_status             VARCHAR(100)  NOT NULL DEFAULT '',
  intake_date            DATE,
  content_assigned_date  DATE,
  web_assigned_date      DATE,
  days_in_stage          INT           NOT NULL DEFAULT 0,
  est_hours              DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
  est_hours_seo          DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
  est_hours_content      DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
  est_hours_web          DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
  actual_hours           DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
  focused_kw             VARCHAR(500),
  volume                 INT,
  current_rank           INT,
  mar_rank               INT,
  content_owner          VARCHAR(100),
  web_owner              VARCHAR(100),
  target_url             TEXT,
  remarks                TEXT,
  execution_state        VARCHAR(50)   NOT NULL DEFAULT 'Not Started',
  doc_url                TEXT,
  created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_client        (client),
  KEY idx_tasks_seo_owner     (seo_owner),
  KEY idx_tasks_intake_date   (intake_date),
  KEY idx_tasks_current_owner (current_owner),
  KEY idx_tasks_execution     (execution_state)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 4. TASK_TIME_EVENTS
--    Ordered log of start / pause / resume / rework_start / end
--    events for a task, per department.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_time_events (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id     VARCHAR(64)     NOT NULL,
  event_type  ENUM('start','pause','resume','rework_start','end') NOT NULL,
  timestamp   DATETIME(3)     NOT NULL,
  department  VARCHAR(50)     NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  KEY idx_tte_task_id   (task_id),
  KEY idx_tte_timestamp (timestamp),
  CONSTRAINT fk_tte_task FOREIGN KEY (task_id)
    REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 5. TASK_REWORK_ENTRIES
--    Each row records one rework cycle assigned to Content/Web.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_rework_entries (
  id                 VARCHAR(64)   NOT NULL,
  task_id            VARCHAR(64)   NOT NULL,
  date               DATE          NOT NULL,
  est_hours          DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
  assigned_dept      ENUM('Content','Web') NOT NULL,
  assigned_owner     VARCHAR(100)  NOT NULL DEFAULT '',
  within_estimate    TINYINT(1)    NOT NULL DEFAULT 0,
  hours_already_spent DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  start_timestamp    DATETIME(3),
  end_timestamp      DATETIME(3),
  duration_ms        BIGINT,
  PRIMARY KEY (id),
  KEY idx_tre_task_id (task_id),
  CONSTRAINT fk_tre_task FOREIGN KEY (task_id)
    REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 6. TASK_COMMENTS
--    Free-text comments attached to a task by any team member.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_comments (
  id        VARCHAR(64)  NOT NULL,
  task_id   VARCHAR(64)  NOT NULL,
  author    VARCHAR(100) NOT NULL DEFAULT '',
  text      TEXT         NOT NULL,
  timestamp DATETIME(3)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_tc_task_id (task_id),
  CONSTRAINT fk_tc_task FOREIGN KEY (task_id)
    REFERENCES tasks(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 7. UPLOAD_HISTORY
--    Records every CSV batch import so uploads can be rolled back.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS upload_history (
  id           VARCHAR(64)  NOT NULL,
  uploaded_by  VARCHAR(100) NOT NULL DEFAULT '',
  uploaded_at  DATETIME(3)  NOT NULL,
  task_count   INT          NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 8. UPLOAD_HISTORY_TASKS
--    Many-to-many link: which task IDs belong to which upload.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS upload_history_tasks (
  upload_id  VARCHAR(64) NOT NULL,
  task_id    VARCHAR(64) NOT NULL,
  PRIMARY KEY (upload_id, task_id),
  CONSTRAINT fk_uht_upload FOREIGN KEY (upload_id)
    REFERENCES upload_history(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- SEED DATA – default users & dropdown options
-- (Safe to delete if you prefer to seed via the app UI)
-- =============================================================

INSERT IGNORE INTO users (id, name, password, role, owner_name) VALUES
  ('admin',   'Admin',   'admin123',   'admin',   ''),
  ('hemang',  'Hemang',  'hemang123',  'seo',     'Hemang'),
  ('imran',   'Imran',   'imran123',   'seo',     'Imran'),
  ('kamna',   'Kamna',   'kamna123',   'seo',     'Kamna'),
  ('manish',  'Manish',  'manish123',  'seo',     'Manish'),
  ('aman',    'Aman',    'aman123',    'content', 'Aman'),
  ('heena',   'Heena',   'heena123',   'content', 'Heena'),
  ('gauri',   'Gauri',   'gauri123',   'web',     'Gauri'),
  ('shubham', 'Shubham', 'shubham123', 'web',     'Shubham');

INSERT IGNORE INTO admin_options (option_type, value, sort_order) VALUES
  -- Clients
  ('clients', 'Aashish Metals',    1),
  ('clients', 'Amardeep',          2),
  ('clients', 'DSE',               3),
  ('clients', 'JadeAlloys',        4),
  ('clients', 'KPS',               5),
  ('clients', 'KPSol',             6),
  ('clients', 'Metinoxoverseas',   7),
  ('clients', 'Milife',            8),
  ('clients', 'Navyug',            9),
  ('clients', 'Petverse',         10),
  ('clients', 'SPAT',             11),
  ('clients', 'Solitaire',        12),
  ('clients', 'USA piping',       13),
  ('clients', 'Unifit',           14),
  -- SEO Owners
  ('seoOwners', 'Hemang', 1),
  ('seoOwners', 'Imran',  2),
  ('seoOwners', 'Kamna',  3),
  ('seoOwners', 'Manish', 4),
  -- Content Owners
  ('contentOwners', 'Aman',  1),
  ('contentOwners', 'Heena', 2),
  -- Web Owners
  ('webOwners', 'Gauri',   1),
  ('webOwners', 'Shubham', 2),
  -- SEO Stages
  ('seoStages', 'Blogs',             1),
  ('seoStages', 'Client Call',       2),
  ('seoStages', 'Development',       3),
  ('seoStages', 'On Page',           4),
  ('seoStages', 'Reports',           5),
  ('seoStages', 'Tech. SEO',         6),
  ('seoStages', 'Whatsapp Message',  7),
  -- SEO QC Statuses
  ('seoQcStatuses', 'Pending',   1),
  ('seoQcStatuses', 'QC',        2),
  ('seoQcStatuses', 'Submit',    3),
  ('seoQcStatuses', 'Completed', 4),
  -- Content Statuses
  ('contentStatuses', 'Pending',  1),
  ('contentStatuses', 'QC',       2),
  ('contentStatuses', 'Submit',   3),
  ('contentStatuses', 'Approved', 4),
  -- Web Statuses
  ('webStatuses', 'Pending',      1),
  ('webStatuses', 'QC',           2),
  ('webStatuses', 'QC Submitted', 3),
  ('webStatuses', 'Completed',    4);
