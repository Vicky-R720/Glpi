package com.glpi.color.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;


@Entity
@Table(name = "kanban_price")
public class KanbanAsk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "ticket_id", nullable = false)
    private  long id_ticket;
    
    @Column(name = "superprice", nullable = false)
    private String superprice;

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

    public String getSuperprice() {
        return superprice;
    }

    public void setSuperprice(String superprice) {
        this.superprice = superprice;
    }

    public KanbanAsk(Long id, long id_ticket, String superprice) {
        this.id = id;
        this.id_ticket = id_ticket;
        this.superprice = superprice;
    }
    
    public KanbanAsk() {
    }
    
}
