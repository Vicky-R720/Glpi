package com.glpi.color.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "kanban_price")
public class KanbanAsk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @JsonProperty("id_ticket")
    @Column(name = "id_ticket", nullable = false)
    private long id_ticket;
    
    @JsonProperty("cout_saisi")
    @Column(name = "cout_saisi", nullable = false)
    private Double cout_saisi;

    @JsonProperty("cout_glpi")
    @Column(name = "cout_glpi", nullable = false)
    private Double cout_glpi;

    @JsonProperty("id_item")
    @Column(name = "id_item", nullable = false)
    private String id_item;

    @JsonProperty("category")
    @Column(name = "category", nullable = false)
    private String category;




    @Column(name = "groupe", nullable = false)
    private OffsetDateTime groupe;

    
    @JsonProperty("type_saisi")
    @Column(name = "type_saisi", nullable = false)
    private String type_saisi;

    public String getType_saisi() {
        return type_saisi;
    }

    public void setType_saisi(String type_saisi) {
        this.type_saisi = type_saisi;
    }

    

    public OffsetDateTime getGroupe() {
        return groupe;
    }

    public void setGroupe(OffsetDateTime groupe) {
        this.groupe = groupe;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public long getId_ticket() {
        return id_ticket;
    }

    public void setId_ticket(long id_ticket) {
        this.id_ticket = id_ticket;
    }

    public Double getCout_saisi() {
        return cout_saisi;
    }

    public void setCout_saisi(Double cout_saisi) {
        this.cout_saisi = cout_saisi;
    }

    public Double getCout_glpi() {
        return cout_glpi;
    }

    public void setCout_glpi(Double cout_glpi) {
        this.cout_glpi = cout_glpi;
    }

    public String getId_item() {
        return id_item;
    }

    public void setId_item(String id_item) {
        this.id_item = id_item;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public KanbanAsk(Long id, long id_ticket, Double cout_saisi, Double cout_glpi, String id_item, String category) {
        this.id = id;
        this.id_ticket = id_ticket;
        this.cout_saisi = cout_saisi;
        this.cout_glpi = cout_glpi;
        this.id_item = id_item;
        this.category = category;
    }
    public KanbanAsk(Long id, long id_ticket, Double cout_saisi, Double cout_glpi, String id_item, String category,
            OffsetDateTime groupe) {
        this.id = id;
        this.id_ticket = id_ticket;
        this.cout_saisi = cout_saisi;
        this.cout_glpi = cout_glpi;
        this.id_item = id_item;
        this.category = category;
        this.groupe = groupe;
    }
    

    public KanbanAsk(Long id, long id_ticket, Double cout_saisi, Double cout_glpi, String id_item, String category,
            OffsetDateTime groupe, String type_saisi) {
        this.id = id;
        this.id_ticket = id_ticket;
        this.cout_saisi = cout_saisi;
        this.cout_glpi = cout_glpi;
        this.id_item = id_item;
        this.category = category;
        this.groupe = groupe;
        this.type_saisi = type_saisi;
    }
    
    public KanbanAsk() {
    }
}
