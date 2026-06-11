package com.glpi.color.controller;

import com.glpi.color.model.KanbanColor;
import com.glpi.color.model.KanbanLanguage;
import com.glpi.color.repository.KanbanLangRepository;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lang")
@CrossOrigin(origins = "*")
public class KanbanLangController {
    @Autowired
    private KanbanLangRepository repository;

    @GetMapping
    public List<KanbanLanguage> getLang(@RequestParam("language") String language) {
        return repository.findByLang(language);
    }

}
