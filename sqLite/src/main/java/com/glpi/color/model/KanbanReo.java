package com.glpi.color.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;


@Entity
@Table(name = "kanban_reo")
public class KanbanReo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "id_ticket", nullable = false)
    private  long id_ticket;
    
    @Column(name = "reo", nullable = false)
    private int reo;

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

    public double getReo(double reo) {
        return reo;
    }

    public void setReo(int reo) {
        this.reo = reo;
    }

    public KanbanReo(Long id, long id_ticket, int reo) {
        this.id = id;
        this.id_ticket = id_ticket;
        this.reo = reo;
    }
    public KanbanReo(){

    }

    
}
