package com.glpi.color.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "status_translation")
public class KanbanLanguage {

    @Id
    private Long id;

    @Column(name = "glpi_ids")
    private String glpi_ids;

    @Column(name = "lang")
    private String lang;

    @Column(name = "name")
    private String name;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getGlpi_ids() {
        return glpi_ids;
    }

    public void setGlpi_ids(String glpi_ids) {
        this.glpi_ids = glpi_ids;
    }

    public String getLang() {
        return lang;
    }

    public void setLang(String lang) {
        this.lang = lang;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    // Constructeur par défaut obligatoire pour JPA/Hibernate
    public KanbanLanguage() {
    }

    public KanbanLanguage(Long id, String glpi_ids, String lang, String name) {
        this.id = id;
        this.glpi_ids = glpi_ids;
        this.lang = lang;
        this.name = name;
    }
}