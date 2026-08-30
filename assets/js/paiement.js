/* ==================================================================
   Etat des eleves et acces parent
   ================================================================== */
  /* ==================================================================
     ÉTAT DES ÉLÈVES — année 2026-2027
     Source : Documents/Etats_élèves26-27.pdf, une ligne par élève.
     Colonnes reprises telles quelles : n° d'ordre, matricule, nom et
     prénoms, date de naissance, classe, affecté de l'État, scolarité,
     transport, cantine, total annuel.
     ================================================================== */
  /* Les dossiers eleves (identite, scolarite, versements) vivent
     desormais dans la base de donnees du back-end
     (ISCA_2027-backend) : parentLogin() interroge /api/parent/login,
     qui ne renvoie que le dossier de l'eleve trouve. */

  /* Moyens de paiement disponibles à Abidjan. Les frais indiqués sont
     ceux couramment pratiqués ; ils restent à confirmer avec
     l'agrégateur retenu. */
  var MOYENS = [
    { cle:"om",      famille:"mobile",   nom:"Orange Money",  sigle:"OM",
      teinte:"#F08902", frais:0.015, delai:"immédiat", format:"07 XX XX XX XX" },
    { cle:"momo",    famille:"mobile",   nom:"MTN MoMo",      sigle:"MoMo",
      teinte:"#FFCC00", frais:0.015, delai:"immédiat", format:"05 XX XX XX XX" },
    { cle:"moov",    famille:"mobile",   nom:"Moov Money",    sigle:"Moov",
      teinte:"#0066B3", frais:0.015, delai:"immédiat", format:"01 XX XX XX XX" },
    { cle:"wave",    famille:"mobile",   nom:"Wave",          sigle:"Wave",
      teinte:"#1DC8F2", frais:0.01,  delai:"immédiat", format:"01 XX XX XX XX" },
    { cle:"carte",   famille:"carte",    nom:"Carte bancaire", sigle:"VISA",
      teinte:"#1A1F71", frais:0.022, delai:"immédiat", format:"" },
    { cle:"virement",famille:"virement", nom:"Virement bancaire", sigle:"RIB",
      teinte:"#152238", frais:0,     delai:"2 à 3 jours ouvrés", format:"" }
  ];

  var RIB = {
    banque:"BACI — Banque Atlantique Côte d'Ivoire",
    titulaire:"INSTITUT SACRE-COEUR D'ADJAME",
    iban:"CI93 CI16 0010 0100 0000 0000 0000",
    swift:"ATCICIAB"
  };

  var eleveConnecte = null;
  var parentToken = null;

  function normalise(s){
    s = String(s || '');
    s = s.replace(/[‘’ʼ`´]/g, "'").replace(/[‐-―]/g, '-');
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* Les quatre informations sont vérifiées côté serveur — voir
     ISCA_2027-backend. Le navigateur ne reçoit que le dossier de
     l'élève trouvé, jamais celui des autres familles. */
  async function parentLogin(){
    var nom  = document.getElementById('pg-nom').value;
    var nais = document.getElementById('pg-naissance').value;
    var mat  = document.getElementById('pg-matricule').value;
    var cls  = document.getElementById('pg-classe').value;
    var err  = document.getElementById('pg-erreur');
    var btn  = document.querySelector('#parent-gate .submit-login');

    err.classList.remove('show');
    if(btn) btn.disabled = true;
    try{
      var r = await fetch(API_BASE + '/api/parent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: nom, naissance: nais, classe: cls, matricule: mat })
      });
      var data = await r.json();
      if(!r.ok){
        err.textContent = data.error || "Aucun élève ne correspond à ces informations.";
        err.classList.add('show');
        return;
      }

      parentToken = data.token;
      var rMe = await fetch(API_BASE + '/api/parent/me', {
        headers: { Authorization: 'Bearer ' + parentToken }
      });
      var dossier = await rMe.json();
      if(!rMe.ok){
        err.textContent = "Session expirée, réessayez.";
        err.classList.add('show');
        return;
      }

      eleveConnecte = dossier;
      afficherDossier(dossier);
    } catch(e){
      err.textContent = "Connexion au serveur impossible. Réessayez.";
      err.classList.add('show');
    } finally {
      if(btn) btn.disabled = false;
    }
  }

  function parentLogout(){
    eleveConnecte = null;
    parentToken = null;
    document.getElementById('parent-espace').style.display = 'none';
    document.getElementById('parent-gate').style.display = 'flex';
    ['pg-nom','pg-naissance','pg-classe','pg-matricule'].forEach(function(i){
      document.getElementById(i).value = '';
    });
    document.getElementById('pg-erreur').classList.remove('show');
  }

  function fcfa(n){
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  }

  function afficherDossier(e){
    document.getElementById('parent-gate').style.display = 'none';
    document.getElementById('parent-espace').style.display = 'block';
    document.getElementById('pg-as-nom').textContent = e.nom;

    var ini = e.nom.split(/\s+/).slice(0,2).map(function(m){ return m[0]; }).join('').toUpperCase();
    document.getElementById('ee-avatar').textContent = ini;
    document.getElementById('ee-nom').textContent = e.nom;

    var d = e.naissance.split('-');
    document.getElementById('ee-meta').textContent =
      e.classe + ' · Matricule ' + e.matricule + ' · Né(e) le ' + d[2] + '/' + d[1] + '/' + d[0];

    var st = document.getElementById('ee-statut');
    st.textContent = e.affecte ? "Affecté de l'État" : "Élève payant";
    st.className = 'ee-statut ' + (e.affecte ? 'affecte' : 'payant');

    /* Les postes viennent du fichier de l'établissement. Un poste absent
       du dossier n'est pas affiché comme « non souscrit » : il n'existe
       simplement pas pour cet élève — l'affecté de l'État n'a pas de
       ligne transport, et c'est une information en soi. */
    /* Échéancier/historique/reçus de démonstration : montants et dates
       illustratifs (aucune donnée réelle de versement derrière), mais
       le nom doit rester celui de l'élève réellement connecté — jamais
       un nom écrit en dur dans la page. */
    var echNom = document.getElementById('ech-nom');
    if(echNom) echNom.textContent = e.nom + ' (' + e.classe + ')';
    document.querySelectorAll('.hist-nom, .recu-nom').forEach(function(el){
      el.textContent = e.nom;
    });

    rendrePostes(e);
    vInit(e);
  }

  /* Le rendu des postes est isolé : après un versement il faut
     rafraîchir le dossier SANS relancer le tunnel, sinon le reçu que le
     parent vient d'obtenir disparaît aussitôt sous l'écran de saisie. */
  function rendrePostes(e){
    document.getElementById('postes').innerHTML = e.postes.map(function(o){
      var reste = Math.max(0, o.du - (o.verse || 0));
      var cls = reste > 0 ? 'du' : 'solde';
      var val = reste > 0 ? vFcfa(reste) : 'À jour';
      var note = reste > 0
        ? (o.verse ? 'Déjà versé ' + vFcfa(o.verse) + ' sur ' + vFcfa(o.du) : 'Dû annuel ' + vFcfa(o.du))
        : 'Réglé en totalité';
      return '<div class="poste ' + cls + '"><span class="p-lbl">' + o.lbl +
             '</span><span class="p-val">' + val + '</span>' +
             '<span class="p-note">' + note + '</span></div>';
    }).join('');
  }

/* ==================================================================
   Tunnel de versement
   ================================================================== */
  /* ==================================================================
     TUNNEL DE VERSEMENT — comportement
     ================================================================== */
  var vChoix = { postes:[], somme:0, moyen:null };

  function vFcfa(n){
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  }
  function vNombre(s){
    var n = parseInt(String(s).replace(/[^\d]/g, ''), 10);
    return isFinite(n) ? n : 0;
  }
  function vRestant(p){ return Math.max(0, p.du - (p.verse || 0)); }

  function vInit(e){
    vChoix = { postes:[], somme:0, moyen:null };
    var hote = document.getElementById('v-postes');
    hote.innerHTML = e.postes.map(function(p, i){
      var r = vRestant(p);
      var solde = r === 0;
      return '<div class="v-poste' + (solde ? ' solde' : '') + '" data-i="' + i + '"' +
             (solde ? '' : ' role="checkbox" aria-checked="false" tabindex="0"') + '>' +
             (solde ? '' : '<span class="v-case" aria-hidden="true"></span>') +
             '<span class="v-p-nom">' + p.lbl + '</span>' +
             '<span class="v-p-du">' + (solde ? 'À jour' : vFcfa(r)) + '</span></div>';
    }).join('');

    hote.querySelectorAll('.v-poste:not(.solde)').forEach(function(el){
      var bascule = function(){
        el.classList.toggle('coche');
        el.setAttribute('aria-checked', el.classList.contains('coche') ? 'true' : 'false');
        vRecalculer(e);
      };
      el.addEventListener('click', bascule);
      el.addEventListener('keydown', function(ev){
        if(ev.key === ' ' || ev.key === 'Enter'){ ev.preventDefault(); bascule(); }
      });
    });

    document.getElementById('v-somme').addEventListener('input', function(){
      vChoix.somme = vNombre(this.value);
      this.value = vChoix.somme ? vChoix.somme.toLocaleString('fr-FR').replace(/ | /g,' ') : '';
      vMajBouton();
    });
    vMoyens();
    vEtape(1);
    vRecalculer(e);
  }

  function vRecalculer(e){
    var sel = [];
    document.querySelectorAll('#v-postes .v-poste.coche').forEach(function(el){
      sel.push(e.postes[+el.dataset.i]);
    });
    vChoix.postes = sel;
    var total = sel.reduce(function(s,p){ return s + vRestant(p); }, 0);
    vChoix.somme = total;
    var champ = document.getElementById('v-somme');
    champ.value = total ? total.toLocaleString('fr-FR').replace(/ | /g,' ') : '';

    /* Raccourcis : la totalité, la moitié, le tiers. Un parent verse
       rarement un montant arbitraire — il verse ce qu'il peut, par
       fractions rondes. */
    var rac = document.getElementById('v-raccourcis');
    if(total > 0){
      var parts = [['Totalité', total], ['Moitié', Math.round(total/2/500)*500],
                   ['Un tiers', Math.round(total/3/500)*500]];
      rac.innerHTML = parts.map(function(p){
        return '<button type="button" class="v-rac" data-v="' + p[1] + '">' +
               p[0] + ' · ' + vFcfa(p[1]) + '</button>';
      }).join('');
      rac.querySelectorAll('.v-rac').forEach(function(b){
        b.addEventListener('click', function(){
          vChoix.somme = +b.dataset.v;
          champ.value = vChoix.somme.toLocaleString('fr-FR').replace(/ | /g,' ');
          vMajBouton();
        });
      });
    } else rac.innerHTML = '';
    vMajBouton();
  }

  function vMajBouton(){
    var aide = document.getElementById('v-aide');
    var b = document.getElementById('v-vers2');
    if(!vChoix.postes.length){
      aide.textContent = 'Sélectionnez au moins un poste à régler.';
      aide.className = 'v-aide'; b.disabled = true; return;
    }
    var max = vChoix.postes.reduce(function(s,p){ return s + vRestant(p); }, 0);
    if(vChoix.somme <= 0){
      aide.textContent = 'Indiquez le montant que vous souhaitez verser.';
      aide.className = 'v-aide'; b.disabled = true; return;
    }
    if(vChoix.somme > max){
      aide.textContent = 'Le montant dépasse le solde dû (' + vFcfa(max) + ').';
      aide.className = 'v-aide erreur'; b.disabled = true; return;
    }
    aide.textContent = vChoix.somme < max
      ? 'Versement partiel : il restera ' + vFcfa(max - vChoix.somme) + ' à régler.'
      : 'Ce versement solde les postes sélectionnés.';
    aide.className = 'v-aide'; b.disabled = false;
  }

  function vMoyens(){
    var par = {mobile:'v-mobile', carte:'v-carte', virement:'v-virement'};
    Object.keys(par).forEach(function(k){ document.getElementById(par[k]).innerHTML = ''; });
    MOYENS.forEach(function(m){
      var h = document.getElementById(par[m.famille]);
      if(!h) return;
      var el = document.createElement('div');
      el.className = 'v-moyen';
      el.setAttribute('role', 'radio');
      el.setAttribute('aria-checked', 'false');
      el.setAttribute('tabindex', '0');
      el.style.setProperty('--teinte', m.teinte);
      el.innerHTML = '<span class="v-m-sigle">' + m.sigle + '</span><span>' +
        '<span class="v-m-nom">' + m.nom + '</span>' +
        '<span class="v-m-sub">' +
        (m.frais ? 'frais ' + (m.frais * 100).toFixed(1).replace('.', ',') + ' %' : 'sans frais') +
        ' · ' + m.delai + '</span></span>';
      var choisir = function(){
        document.querySelectorAll('.v-moyen').forEach(function(x){
          x.classList.remove('choisi'); x.setAttribute('aria-checked', 'false');
        });
        el.classList.add('choisi'); el.setAttribute('aria-checked', 'true');
        vChoix.moyen = m;
        document.getElementById('v-vers3').disabled = false;
      };
      el.addEventListener('click', choisir);
      el.addEventListener('keydown', function(ev){
        if(ev.key === ' ' || ev.key === 'Enter'){ ev.preventDefault(); choisir(); }
      });
      h.appendChild(el);
    });
  }

  function vEtape(n){
    document.querySelectorAll('.v-vue').forEach(function(v){ v.hidden = (+v.dataset.vue !== n); });
    document.querySelectorAll('.v-etape').forEach(function(e){
      var k = +e.dataset.e;
      e.classList.toggle('actif', k === n);
      e.classList.toggle('faite', k < n);
    });
    document.querySelectorAll('.v-lien').forEach(function(l, i){ l.classList.toggle('faite', i < n - 1); });
    if(n === 3) vSaisie();
    var s = document.getElementById('versement');
    if(s) s.scrollIntoView({block:'start', behavior:'smooth'});
  }

  function vRecapHtml(){
    var m = vChoix.moyen;
    var frais = Math.round(vChoix.somme * (m ? m.frais : 0));
    var tiret = '—';
    return '<h4>Récapitulatif</h4>' +
      '<div class="v-r-ligne"><span>Élève</span><b>' + (eleveConnecte ? eleveConnecte.nom : tiret) + '</b></div>' +
      '<div class="v-r-ligne"><span>Classe</span><b>' + (eleveConnecte ? eleveConnecte.classe : tiret) + '</b></div>' +
      '<div class="v-r-ligne"><span>Postes</span><b>' +
        (vChoix.postes.map(function(p){ return p.lbl; }).join(', ') || tiret) + '</b></div>' +
      '<div class="v-r-ligne"><span>Versement</span><b>' + vFcfa(vChoix.somme) + '</b></div>' +
      '<div class="v-r-ligne"><span>Moyen</span><b>' + (m ? m.nom : tiret) + '</b></div>' +
      '<div class="v-r-ligne"><span>Frais</span><b>' + (frais ? vFcfa(frais) : 'aucun') + '</b></div>' +
      '<div class="v-r-total"><span>Total à débiter</span><b>' + vFcfa(vChoix.somme + frais) + '</b></div>';
  }

  function vSaisie(){
    var m = vChoix.moyen;
    var s = document.getElementById('v-saisie');
    document.getElementById('v-recu').innerHTML = vRecapHtml();
    if(!m){ s.innerHTML = ''; return; }
    var mat = eleveConnecte ? eleveConnecte.matricule : '—';

    if(m.famille === 'mobile'){
      document.getElementById('v-titre3').textContent = 'Paiement par ' + m.nom;
      document.getElementById('v-sous3').textContent =
        'Vous recevrez une demande de confirmation sur votre téléphone.';
      s.innerHTML =
        '<div class="v-consigne">Composez le numéro rattaché à votre compte ' + m.nom +
        '. Une notification vous demandera votre code secret pour valider — ' +
        'ce code ne transite jamais par ce site.</div>' +
        '<div class="login-field"><label for="v-tel">Numéro ' + m.nom + '</label>' +
        '<input type="tel" id="v-tel" inputmode="tel" placeholder="' + m.format + '" autocomplete="tel"></div>' +
        '<div class="login-field"><label for="v-nomp">Nom du titulaire du compte</label>' +
        '<input type="text" id="v-nomp" placeholder="tel qu’enregistré chez l’opérateur"></div>';

    } else if(m.famille === 'carte'){
      document.getElementById('v-titre3').textContent = 'Paiement par carte bancaire';
      document.getElementById('v-sous3').textContent =
        'Connexion chiffrée. Les données de votre carte ne sont pas conservées par l’établissement.';
      s.innerHTML =
        '<div class="v-consigne">Visa et Mastercard sont acceptées. Le débit est immédiat ' +
        'et le reçu vous est remis en fin d’opération.</div>' +
        '<div class="login-field"><label for="v-carte-num">Numéro de carte</label>' +
        '<input type="text" id="v-carte-num" inputmode="numeric" maxlength="19" placeholder="0000 0000 0000 0000" autocomplete="cc-number"></div>' +
        '<div class="login-field"><label for="v-carte-exp">Expiration</label>' +
        '<input type="text" id="v-carte-exp" inputmode="numeric" maxlength="7" placeholder="MM / AA" autocomplete="cc-exp"></div>' +
        '<div class="login-field"><label for="v-carte-cvv">Cryptogramme</label>' +
        '<input type="text" id="v-carte-cvv" inputmode="numeric" maxlength="4" placeholder="3 chiffres au dos" autocomplete="cc-csc"></div>' +
        '<div class="login-field"><label for="v-carte-nom">Titulaire</label>' +
        '<input type="text" id="v-carte-nom" placeholder="Nom et prénoms" autocomplete="cc-name"></div>';

    } else {
      document.getElementById('v-titre3').textContent = 'Virement bancaire';
      document.getElementById('v-sous3').textContent =
        'Effectuez le virement depuis votre banque, puis signalez-le à l’établissement.';
      s.innerHTML =
        '<div class="v-consigne">Indiquez impérativement en référence le <b>matricule de ' +
        'l’élève</b> — ' + mat + ' — sans quoi le versement ne pourra pas être ' +
        'rattaché à son dossier.</div>' +
        '<div class="v-rib">' +
        '<div class="v-rib-ligne"><span>Banque</span><span>' + RIB.banque + '</span></div>' +
        '<div class="v-rib-ligne"><span>Titulaire</span><span>' + RIB.titulaire + '</span></div>' +
        '<div class="v-rib-ligne"><span>IBAN</span><span>' + RIB.iban + '</span></div>' +
        '<div class="v-rib-ligne"><span>Code SWIFT</span><span>' + RIB.swift + '</span></div>' +
        '<div class="v-rib-ligne"><span>Référence à porter</span><span>' + mat + '</span></div>' +
        '</div>' +
        '<button type="button" class="v-copier" onclick="vCopierRib(this)">Copier les coordonnées</button>';
    }
  }

  function vCopierRib(b){
    var t = RIB.banque + '\n' + RIB.titulaire + '\nIBAN ' + RIB.iban +
            '\nSWIFT ' + RIB.swift + '\nRéférence ' +
            (eleveConnecte ? eleveConnecte.matricule : '');
    var fini = function(){
      b.textContent = 'Coordonnées copiées'; b.classList.add('fait');
      setTimeout(function(){
        b.textContent = 'Copier les coordonnées'; b.classList.remove('fait');
      }, 2200);
    };
    if(navigator.clipboard) navigator.clipboard.writeText(t).then(fini, fini); else fini();
  }

  /* Chaque versement est desormais enregistre par le serveur (voir
     ISCA_2027-backend, table Payment) : une reference reelle, verifiee
     au rechargement, et non plus un numero tire au hasard qui
     s'evaporait en quittant la page. La repartition d'une somme
     unique sur plusieurs postes reste calculee ici (c'est un choix
     d'affichage), mais chaque part est soumise individuellement au
     serveur, qui reste seul juge du solde reellement du. */
  async function vValider(){
    var btn = document.getElementById('v-valider');
    if(btn) btn.disabled = true;

    var reste = vChoix.somme;
    var parts = [];
    vChoix.postes.forEach(function(p){
      var r = vRestant(p);
      var part = Math.min(reste, r);
      if(part > 0) parts.push({ cle: p.cle, montant: part });
      reste -= part;
    });

    try{
      var references = [];
      for(var i = 0; i < parts.length; i++){
        var r = await fetch(API_BASE + '/api/parent/verser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + parentToken },
          body: JSON.stringify({ feeKey: parts[i].cle, amount: parts[i].montant, method: vChoix.moyen })
        });
        var data = await r.json();
        if(!r.ok){
          alert(data.error || "Le versement n'a pas pu être enregistré.");
          return;
        }
        references.push(data.versement.reference);
      }

      var rMe = await fetch(API_BASE + '/api/parent/me', {
        headers: { Authorization: 'Bearer ' + parentToken }
      });
      eleveConnecte = await rMe.json();

      var ref = references.join(' · ');
      document.getElementById('v-ref').textContent = ref;
      document.getElementById('v-recu-final').innerHTML =
        '<div class="v-recu">' + vRecapHtml() +
        '<div class="v-r-ligne" style="margin-top:10px"><span>Référence</span><b>' + ref + '</b></div>' +
        '<div class="v-r-ligne"><span>Date</span><b>' + new Date().toLocaleDateString('fr-FR') + '</b></div></div>';

      vEtape(4);
      rendrePostes(eleveConnecte);
    } catch(e){
      alert("Connexion au serveur impossible. Réessayez.");
    } finally {
      if(btn) btn.disabled = false;
    }
  }

  function vRecommencer(){ if(eleveConnecte) vInit(eleveConnecte); }

