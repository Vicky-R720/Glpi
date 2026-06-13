package com.glpi.color.controller;


import com.glpi.color.model.KanbanReo;
import com.glpi.color.model.KanbanAsk;
import com.glpi.color.repository.KanbanReoRepository;
import com.glpi.color.repository.KanbanAskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;


import java.util.List;

@RestController
@RequestMapping("/api/reo")
@CrossOrigin(origins = "*")
public class KanbanReoController {

    @Autowired
    private KanbanReoRepository repository;

    @Autowired
    private KanbanAskRepository askrepository;

    
    @GetMapping
    public List<KanbanReo> getAllReo(){
        return repository.findAll();
    }

    @PostMapping 
    public ResponseEntity<?> createReouverture(@RequestBody Map<String, Object> body){
        Long idTicket = Long.parseLong(body.get("id_ticket").toString());
        double pourcentage = Double.parseDouble(body.get("pourcentage").toString());

        return askrepository.findLasByTicketID(idTicket).map(ask -> {
            double superprice = ask.getCout_saisi() != null ? ask.getCout_saisi() : 0.0;
            int prixreo = parseInt(superprice*pourcentage / 100);

            KanbanReo reo = new KanbanReo();
            reo.setId_ticket(idTicket);
            reo.setReo(prixreo);

            return ResponseEntity.ok(repository.save(reo));


        })
        .orElse(ResponseEntity.badRequest().build());




    }

    private int parseInt(double d) {
        return 0;
    }

   


}
