package com.glpi.color.controller;

import com.glpi.color.model.KanbanColor;
import com.glpi.color.repository.KanbanColorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/colors")
@CrossOrigin(origins = "*") // Allows React frontend to fetch
public class KanbanColorController {

    @Autowired
    private KanbanColorRepository repository;

    @GetMapping
    public KanbanColor getColors() {
        return repository.findById(1L).orElseGet(() -> {
            KanbanColor defaultColors = new KanbanColor(1L, "#ffb3ba", "#bae1ff", "#baffc9");
            return repository.save(defaultColors);
        });
    }

    @PutMapping
    public KanbanColor updateColors(@RequestBody KanbanColor newColors) {
        KanbanColor colors = repository.findById(1L).orElse(new KanbanColor(1L, "#ffb3ba", "#bae1ff", "#baffc9"));
        colors.setColorNouveau(newColors.getColorNouveau());
        colors.setColorEnCours(newColors.getColorEnCours());
        colors.setColorTermine(newColors.getColorTermine());
        return repository.save(colors);
    }
}
