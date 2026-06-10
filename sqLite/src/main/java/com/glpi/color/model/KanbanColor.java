package com.glpi.color.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "kanban_colors")
public class KanbanColor {

    @Id
    private Long id;
    
    @Column(name = "color_nouveau")
    private String colorNouveau;
    
    @Column(name = "color_encours")
    private String colorEnCours;
    
    @Column(name = "color_termine")
    private String colorTermine;

    public KanbanColor() {
    }

    public KanbanColor(Long id, String colorNouveau, String colorEnCours, String colorTermine) {
        this.id = id;
        this.colorNouveau = colorNouveau;
        this.colorEnCours = colorEnCours;
        this.colorTermine = colorTermine;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getColorNouveau() { return colorNouveau; }
    public void setColorNouveau(String colorNouveau) { this.colorNouveau = colorNouveau; }

    public String getColorEnCours() { return colorEnCours; }
    public void setColorEnCours(String colorEnCours) { this.colorEnCours = colorEnCours; }

    public String getColorTermine() { return colorTermine; }
    public void setColorTermine(String colorTermine) { this.colorTermine = colorTermine; }
}
