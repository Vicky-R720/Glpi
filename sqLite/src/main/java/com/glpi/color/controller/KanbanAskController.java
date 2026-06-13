package com.glpi.color.controller;


import com.glpi.color.model.KanbanAsk;
import com.glpi.color.repository.KanbanAskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/ask")
@CrossOrigin(origins = "*")
public class KanbanAskController {

    @Autowired
    private KanbanAskRepository repository;

    @PostMapping
    public ResponseEntity<?> createAsk(@RequestBody KanbanAsk kanbanask){
        System.out.println("[ASK POST] Received: id_ticket=" + kanbanask.getId_ticket() 
            + ", cout_saisi=" + kanbanask.getCout_saisi() 
            + ", cout_glpi=" + kanbanask.getCout_glpi()
            + ", id_item=" + kanbanask.getId_item()
            + ", category=" + kanbanask.getCategory()
            + ", groupe=" + kanbanask.getGroupe()
            + ", type_saisi=" + kanbanask.getType_saisi()
            );
        try {
            kanbanask.setId(null); // Force insert, never update
            KanbanAsk saved = repository.save(kanbanask);
            System.out.println("[ASK POST] Inserted new record id=" + saved.getId());
            return ResponseEntity.ok(saved);
        } catch (Exception ex) {
            System.err.println("[ASK POST] ERROR: " + ex.getMessage());
            ex.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("error", ex.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping
    public List<KanbanAsk> getAllAsks(){
        return repository.findAll();
    }

    // Endpoint de test - ouvrir http://localhost:8080/api/ask/test dans le navigateur
    @GetMapping("/test")
    public ResponseEntity<?> testInsert(){
        try {
            KanbanAsk test = new KanbanAsk();
            test.setId_ticket(999);
            test.setCout_saisi(100.0);
            test.setCout_glpi(50.0);
            test.setId_item("TEST-001");
            test.setCategory("Test");
            KanbanAsk saved = repository.save(test);
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Test record inserted successfully!");
            result.put("record", saved);
            result.put("total_records", repository.findAll().size());
            return ResponseEntity.ok(result);
        } catch (Exception ex) {
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("error", ex.getMessage());
            return ResponseEntity.status(500).body(result);
        }
    }

    @PostMapping("/sync")
    public void syncAsks(@RequestBody List<KanbanAsk> asks){
        for (KanbanAsk ask : asks) {
            java.util.Optional<KanbanAsk> existing = repository.findByIdTicketAndIdItem(ask.getId_ticket(), ask.getId_item());
            if (existing.isPresent()) {
                KanbanAsk e = existing.get();
                e.setCout_glpi(ask.getCout_glpi());
                e.setCategory(ask.getCategory());
                repository.save(e);
            } else {
                if (ask.getCout_saisi() == null) ask.setCout_saisi(0.0);
                repository.save(ask);
            }
        }
    }

    @DeleteMapping("/ticket/{id}")
    public ResponseEntity<?> deleteLastGroupe(@PathVariable long id){
        List<KanbanAsk> rows = repository.findByTicketIdAndMaxGroupe(id);
        if (rows.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteAll(rows);
        Map<String, Object> result = new HashMap<>();
        result.put("deleted", rows.size());
        result.put("id_ticket", id);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/price/{id}")
    public double getprice(@PathVariable long id){
        Double farany = repository.findLastSuperPriceByTicketId(id);
        return farany != null ? farany : 0.0;
    }

    

}
