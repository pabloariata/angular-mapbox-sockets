import { Component, OnInit } from '@angular/core';
import { Lugar } from 'src/app/interfaces/interfaces';

import * as mapboxgl from 'mapbox-gl';
import { WebsocketService } from 'src/app/services/websocket.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

interface RespMarcadores {
  [key: string]: Lugar
}

@Component({
  selector: 'app-mapa',
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.css']
})
export class MapaComponent implements OnInit {


  mapa!: mapboxgl.Map;

  
  // lugares: Lugar[] = [];
  lugares: RespMarcadores = {};
  markersMapBox: {[id: string]: mapboxgl.Marker} = {};

  constructor(public wsSrv: WebsocketService, private http: HttpClient) { }

  ngOnInit(): void {
    this.getMarcadores();
    this.escucharSockets();
    // this.crearMapa();
  }

  escucharSockets() {

    // nuevo-marcador
    this.wsSrv.listen('marcador-nuevo').subscribe((marcador: any) => this.agregarMarcador(marcador));

    // marcador-mover
    this.wsSrv.listen('movi-marcador').subscribe((marcador: any) => {

      console.log('tengo que mover!!!');

      console.log(marcador);


      const newLngLat = new mapboxgl.LngLat(marcador.lng, marcador.lat);

      this.markersMapBox[marcador.id].setLngLat(newLngLat);

    });

    // marcador-borrar
    this.wsSrv.listen('marcador-borrado').subscribe((id: any) => {
      // borra el marcador de mapbox (el remove es metodo del marcador)
      this.markersMapBox[id].remove();
      // lo borramos del objeto en memoria
      delete this.markersMapBox[id];
    });

  }

  getMarcadores() {

    this.http.get<RespMarcadores>(`${environment.api_url}/mapa`).subscribe(lugares => {
      this.lugares = lugares;
      this.crearMapa();
    });

  }


  crearMapa() {
    (mapboxgl as any).accessToken = 'pk.eyJ1IjoicGFibG9hcmlhdGEiLCJhIjoiY2w0eWpiNHExMDQyMDNkcDg0ajZlOWR0biJ9.E27tf6fWxRE1RZ5RR3huRg';
    this.mapa = new mapboxgl.Map({
      container: 'mapa',
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-75.7551299358293, 45.349977429009954],
      zoom: 15.8
    });

    
    // recorremos de esta manera, ya que la API nos devuelve un objeto, y no un arreglo (asi lo configuramos en el servidor)
    for (const [id, marcador] of Object.entries(this.lugares)) {
      this.agregarMarcador(marcador);
    }

  }

  agregarMarcador(marcador: Lugar) {

    // creamos el objeto LngLat de mapbox, para asignarselo al marker en el map
    const lngLat = new mapboxgl.LngLat(marcador.lng, marcador.lat);

    /* const html = `<h2>${marcador.nombre}</h2>
                  <br>
                  <button>Borrar</button>`; */

    const h2 = document.createElement('h2');
    h2.innerText = marcador.nombre;

    const btnBorrar = document.createElement('button');
    btnBorrar.innerText = 'Borrar';
    
    
    
    const div = document.createElement('div');
    div.append(h2, btnBorrar);


    const customPopUp = new mapboxgl.Popup({
      offset: 25,
      closeOnClick: false,
    }).setDOMContent(div);
      // .setHTML(html);

    const marker = new mapboxgl.Marker({
      draggable: true,
      color: marcador.color,
      
      
    }).setLngLat(lngLat)
      .setPopup(customPopUp)
      .addTo(this.mapa);

      marker.on('drag', () => {

        const lngLat = marker.getLngLat();

        const nuevoMarcador = {
          id: marcador.id,
          lng: lngLat.lng,
          lat: lngLat.lat
        }

        //TODO: crear evento para emitir las coordenadas de este marcador
        this.wsSrv.emit('mover-marcador', nuevoMarcador);

      });

      btnBorrar.addEventListener('click', () => {

        marker.remove();

        this.wsSrv.emit('borrar-marcador', marcador.id);


      });

    // agregamos esta instancia a este array, para mantener referencia a los marcadores, para poder enviarlo al servidor y poder manejarlos alla
    this.markersMapBox[marcador.id] = marker;

  }

  crearMarcador() {

    const nuevoMarcador: Lugar = {
      id: new Date().toISOString(),
      lat: 45.349977429009954,
      lng: -75.7551299358293,
      nombre: 'Sin Nombre',
      color: '#' + Math.floor(Math.random()*16777215).toString(16) 

    }



    this.agregarMarcador(nuevoMarcador);

    // emitir marcador-nuevo
    this.wsSrv.emit('marcador-nuevo', nuevoMarcador);

  }



}
