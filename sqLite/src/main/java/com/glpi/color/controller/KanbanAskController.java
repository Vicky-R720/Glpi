package com.glpi.color.controller;


import com.glpi.color.model.KanbanAsk;
import com.glpi.color.repository.KanbanAskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;


import java.util.List;

@RestController
@RequestMapping("/api/ask")
@CrossOrigin(origins = "*")
public class KanbanAskController {

    @Autowired
    private KanbanAskRepository repository;

    @PostMapping
    public KanbanAsk createAsk(@RequestBody KanbanAsk kanbanask){
        return repository.save(kanbanask);
    }

    @GetMapping
    public List<KanbanAsk> getAllAsks(){
        return repository.findAll();
    }
}
