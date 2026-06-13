package com.glpi.color;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.io.File;

@SpringBootApplication
public class KanbanColorApplication {
	public static void main(String[] args) {
		// Programmatic drop of outdated kanban_price table
		String[] dbPaths = {"kanban.db", "sqLite/kanban.db", "../sqLite/kanban.db"};
		for (String dbPath : dbPaths) {
			try {
				File file = new File(dbPath);
				if (!file.exists()) {
					continue;
				}
				Class.forName("org.sqlite.JDBC");
				String url = "jdbc:sqlite:" + dbPath;
				try (Connection conn = DriverManager.getConnection(url)) {
					if (conn != null) {
						boolean hasCoutSaisi = false;
						boolean tableExists = false;
						try (Statement stmt = conn.createStatement();
							 ResultSet rs = stmt.executeQuery("PRAGMA table_info(kanban_price)")) {
							while (rs.next()) {
								tableExists = true;
								String columnName = rs.getString("name");
								if ("cout_saisi".equalsIgnoreCase(columnName)) {
									hasCoutSaisi = true;
								}
							}
						}
						if (tableExists && !hasCoutSaisi) {
							System.out.println("[DB Migrator] Dropping old kanban_price table from " + dbPath + " since it has an outdated schema...");
							try (Statement stmt = conn.createStatement()) {
								stmt.execute("DROP TABLE IF EXISTS kanban_price");
							}
						}
					}
				}
			} catch (Exception e) {
				System.err.println("[DB Migrator] Error checking dbPath " + dbPath + ": " + e.getMessage());
			}
		}

		SpringApplication.run(KanbanColorApplication.class, args);
	}
}
