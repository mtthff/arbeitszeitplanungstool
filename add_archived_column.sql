-- Migration: Hinzufügen der archived Spalte zur users-Tabelle
-- Datum: 2026-01-16

ALTER TABLE users ADD COLUMN archived TINYINT(1) DEFAULT 0 AFTER is_leitung;
