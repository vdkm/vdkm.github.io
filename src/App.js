import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, LayerGroup, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import openIcon from './icons/eventOpened.svg';
import flipIcon from './icons/eventFlipped.svg';
import tempIcon from './icons/temperature.svg';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import Header from './Header.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import bootstrap from 'bootstrap';
import './styles/style.css';
import annotationPlugin from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';
import { right } from '@popperjs/core';

Chart.register(zoomPlugin);
Chart.register(annotationPlugin);
Chart.register(...registerables);

const markerFlipIcon = new L.Icon({
  iconUrl: flipIcon,
  iconRetinaUrl: flipIcon,
  popupAnchor: [-0, -0],
  iconSize: [32, 45],
});
const markerOpenIcon = new L.Icon({
  iconUrl: openIcon,
  iconRetinaUrl: openIcon,
  popupAnchor: [-0, -0],
  iconSize: [32, 45],
});

const markerTempIcon = new L.Icon({
  iconUrl: tempIcon,
  iconRetinaUrl: tempIcon,
  popupAnchor: [-0, -0],
  iconSize: [16],
});



function App() {

  const [allServices, setAllServices] = useState([]);
  const [allCharacteristics, setAllCharacteristics] = useState([]);
  const [isDisconnected, setIsDisconnected] = useState(true);
  const [markerId, setMarkerId] = useState(null);
  const chartReference = useRef();
  const mapReference = useRef();
  const [chartDataset, setChartDataset] = useState([]);
  const [chartLabels, setChartLabels] = useState([]);
  const [flipArray, setFlipArray] = useState([]);
  const [openArray, setOpenArray] = useState([]);
  const [temperatureArray, setTemperatureArray] = useState([]);
  const [pathPosition, setPathPosition] = useState([]);
  const [allPointsArray, setAllPointsArray] = useState([]);
  const CMD_START = 255;
  const CMD_END = 254;
  const TYPE_TEMPERATURE = 1;
  const TYPE_EVENT_FLIP = 2;
  const TYPE_EVENT_OPEN = 3;
  let buffer = [];
  let idTemperatureMarker = -1;
  let idFlipMarker = -1;
  let idOpenMarker = -1;
  let notifyCharacteristic;
  let writeCharacteristic;

  allCharacteristics.map(current => {
    switch (current.characteristic.uuid) {
      case "00001307-8e22-4541-9d4c-21edae82ed19": // Notify characteristic
        notifyCharacteristic = current;
        notifyCharacteristic.characteristic.startNotifications();
        notifyCharacteristic.characteristic.oncharacteristicvaluechanged = notifHandler;
        break;
      case "00001308-8e22-4541-9d4c-21edae82ed19": // Write characteristic
        writeCharacteristic = current;
        break;
    }
  })

  // convert hex into float
  const parseFloat = (str) => {
    var int = parseInt(str, 16);
    if (int > 0 || int < 0) {
      var sign = (int >>> 31) ? -1 : 1;
      var exp = (int >>> 23 & 0xff) - 127;
      var mantissa = ((int & 0x7fffff) + 0x800000).toString(2);
      var float32 = 0
      for (let i = 0; i < mantissa.length; i += 1) { float32 += parseInt(mantissa[i]) ? Math.pow(2, exp) : 0; exp-- }
      return float32 * sign;
    } else return 0
  }

  // Add a 0 if the hex number is only one digit (ex: 0x4 --> 0x04)
  // and return the latitude and longitude in float
  function locationParser(buffer, j) {
    let myLat = '';
    let myLng = '';
    for (var e = 4; e > 0; e--) {
      let currentByte = '';
      if (buffer[j + e].toString(16).length < 2) {
        currentByte = "0" + buffer[j + e].toString(16);
      } else {
        currentByte = buffer[j + e].toString(16)
      }
      myLat += currentByte;
    }
    for (var f = 8; f > 4; f--) {
      let currentByte = '';
      if (buffer[j + f].toString(16).length < 2) {
        currentByte = "0" + buffer[j + f].toString(16);
      } else {
        currentByte = buffer[j + f].toString(16)
      }
      myLng += currentByte;
    }
    return [parseFloat(myLat), parseFloat(myLng)]; // parseFloat() convert hex to float
  }

  // Add a 0 if the hex number is only one digit (ex: 0x4 --> 0x04)
  // and return the temperature in float
  function temperatureParser(buffer, j) {
    let myTemp = '';
    for (var e = 4; e > 0; e--) {
      let currentByte = '';
      if (buffer[j + e].toString(16).length < 2) {
        currentByte = "0" + buffer[j + e].toString(16);
      } else {
        currentByte = buffer[j + e].toString(16)
      }
      myTemp += currentByte;
    }
    return parseFloat(myTemp);
  }

  // Add a 0 if the hex number is only one digit (ex: 0x4 --> 0x04)
  // and return the unix timestamp
  function timestampParser(buffer, j) {
    let myTemp = '';
    for (var e = 4; e > 0; e--) {
      let currentByte = '';
      if (buffer[j + e].toString(16).length < 2) {
        currentByte = "0" + buffer[j + e].toString(16);
      } else {
        currentByte = buffer[j + e].toString(16)
      }
      myTemp += currentByte;
    }
    return parseInt(myTemp, 16);
  }


  function notifHandler(e) {
    console.log(e);
    let temporaryBuffer = '';
    let buf;
    // let buf = new Uint8Array(e.target.value.buffer);
    // console.log(buf);
    // // Uint8Array are fixed length array
    // // convert the Uint8Array into a flexible length number array
    // temporaryBuffer += buf.toString() + ',';
    // temporaryBuffer = temporaryBuffer.split(',');
    // temporaryBuffer.pop();
    // temporaryBuffer.map(str => {
    //   buffer.push(Number(str));
    // });
    if (e == 'clear'){
      setOpenArray([]);
      setFlipArray([]);
      setTemperatureArray([]);
      setPathPosition([]);
      setChartDataset([]);
      setChartLabels([]);
      setAllPointsArray([]);
    }else{
      buf = new Uint8Array(e.target.value.buffer);
      console.log(buf);
      // Uint8Array are fixed length array
      // convert the Uint8Array into a flexible length number array
      temporaryBuffer += buf.toString() + ',';
      temporaryBuffer = temporaryBuffer.split(',');
      temporaryBuffer.pop();
      temporaryBuffer.map(str => {
        buffer.push(Number(str));
      });
    }
    console.log(buffer);
    console.log(buffer[buffer.length - 1]);

    if (buffer[buffer.length - 1] === CMD_END) {// If last item of the array is END
      let j = 0;
      let dataReceived = [];
      setOpenArray([]);
      setFlipArray([]);
      setTemperatureArray([]);
      setPathPosition([]);
      setChartDataset([]);
      setChartLabels([]);
      if (buffer[0] === CMD_START) { // START 0xFF
        j++; // Shift 1 bytes
        while (buffer[j] !== CMD_END) { // END 0xfe
          let timestamp = timestampParser(buffer, j);
          // // Convert decimal to hexadecimal and reverse
          // let timestamp = buffer[j + 4].toString(16) + buffer[j + 3].toString(16) + buffer[j + 2].toString(16) + buffer[j + 1].toString(16);
          // // Convert hexadecimal to decimal, result in a unix timestamp
          // timestamp = parseInt(timestamp, 16);
          switch (buffer[j]) {
            case TYPE_TEMPERATURE: // Temperature
              j += 4; // Shift 4 bytes (timestamp bytes)
              let temperatureMeasurementObject = new Object();
              temperatureMeasurementObject.type = "temperature";
              temperatureMeasurementObject.timestamp = timestamp;
              temperatureMeasurementObject.location = locationParser(buffer, j);
              j += 8; // Shift 8 bytes (location bytes)
              temperatureMeasurementObject.temperature = temperatureParser(buffer, j);
              dataReceived.push(temperatureMeasurementObject);
              break;
            case TYPE_EVENT_FLIP: // Event flipped
              j += 4; // Shift 4 bytes (timestamp bytes)
              let flipEventObject = new Object();
              flipEventObject.type = "flipped";
              flipEventObject.timestamp = timestamp;
              flipEventObject.location = locationParser(buffer, j);
              flipEventObject.indication = "flipped";
              j += 8; // Shift 8 bytes (location bytes)
              flipEventObject.temperature = temperatureParser(buffer, j);
              dataReceived.push(flipEventObject);
              break;
            case TYPE_EVENT_OPEN: // event Opened
              j += 4; // Shift 4 bytes (timestamp bytes)
              let openEventObject = new Object();
              openEventObject.type = "opened";
              openEventObject.timestamp = timestamp;
              openEventObject.location = locationParser(buffer, j);
              openEventObject.indication = "opened";
              j += 8; // Shift 8 bytes (location bytes)
              openEventObject.temperature = temperatureParser(buffer, j);
              dataReceived.push(openEventObject);
              break;
          }
          j += 4; // Shift 4 bytes (temperature bytes)
          j++; // Shift 1 bytes  (type byte)
        }
        // Sort timestamp using compare method
        dataReceived.sort(function (a, b) { return a.timestamp - b.timestamp });
        // Convert timestamp into date
        dataReceived.map(ele => {
          let currentTimestamp = ele.timestamp;
          let date = new Date(currentTimestamp * 1000).toLocaleDateString("fr")
          let time = new Date(currentTimestamp * 1000).toLocaleTimeString("fr")
          ele.timestamp = date + ' : ' + time;
        })

        // Sort the different object in function of their type
        console.table(dataReceived);
        dataReceived.map(current => {
          setPathPosition(oldArray => [...oldArray, current.location]);
          if (current.type === "flipped") {
            setFlipArray(oldArray => [...oldArray, current]);
          }
          if (current.type === "opened") {
            setOpenArray(oldArray => [...oldArray, current]);
          }
          if (current.type === "temperature") {
            setTemperatureArray(oldArray => [...oldArray, current]);
          }
          setChartDataset(oldArray => [...oldArray, current.temperature]);
          setChartLabels(oldArray => [...oldArray, current.timestamp]);
        })
      }
      // Sets the map view to the starting point location
      mapReference.current.setView(dataReceived[Math.floor(dataReceived.length/2)].location, 5);
      buffer = []
      setAllPointsArray(dataReceived);
    }
  }

  let chartData = {
    labels: chartLabels,
    datasets: [{
      borderColor: '#03234B',
      backgroundColor: '#3CB4E6',
      pointBackgroundColor: function(context) {
        var index = context.dataIndex;
        // Change color of flipped and opened type points
        if (allPointsArray[index] !== undefined){
          if (allPointsArray[index].type === "flipped"){
            return '#FFD200';  
          }else if (allPointsArray[index].type === "opened"){
            return '#3CB4E6'; 
          }else{
            return '#E6007E';
          }
        }
      },
      pointRadius: customRadius,
      pointStyle: function(context) {
        var index = context.dataIndex;
        // Change color of flipped and opened type points
        if (allPointsArray[index] !== undefined){
          if (allPointsArray[index].type === "flipped"){
            return 'rectRot';  
          }else if (allPointsArray[index].type === "opened"){
            return 'triangle'; 
          }else{
            return 'circle';
          }
        }
      },
      data: chartDataset,
    }]
  }
  let chartOptions = {
    scales: {
      yAxes: {
        title: {
          display: true,
          text: 'Temperature in °C',
          color: '#03234B',
          font: {
            family: 'Arial',
            size: 15
          }
        },
        ticks: {
          precision: 10
        }
      },
      xAxes: {
        title: {
          display: true,
          text: 'Time',
          color: '#03234B',
          font: {
            family: 'Arial',
            size: 15
          }
        },
        ticks: {
          display: false,
          autoSkip: true,
          maxRotation: 0,
          minRotation: 0,
          maxTicksLimit: 10
        }
      },
    },
    aspectRatio: 4,
    maintainAspectRatio: false,
    responsive: true,
    transition: {
      duration: 0,
    },
    plugins: {
      zoom: {
        pan: {
          enabled: true,
          mode: 'xy',
          // modifierKey: 'ctrl',
        },
        zoom: {
          // drag: {
          //   enabled: true,
          // },
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'xy',
        }
      },
      legend: {
        display: false
      },
      title: {
        position: 'top',
        padding: 20,
        align: 'start',
        color: '#03234B',
        display: false,
        text: 'Temperature Chart',
        font: {
          family: 'Arial',
          size: 15,
        },
      }
    }
  }

    function customRadius(context) {
      var index = context.dataIndex;
      // Change point radius of clicked map marker
      if (index === markerId){
        return 18;  
      }
      // Change radius of flipped and opened type points
      if (allPointsArray[index] !== undefined){
        if (allPointsArray[index].type === "flipped" || allPointsArray[index].type === "opened"){
          return 13;  
        }else{
          return 5;
        }
      }
  }

  function resetChartZoom() {
    chartReference.current.resetZoom();
  }

  function clear() {
    notifHandler('clear');
  }

  return (
    <div className="App">
      <Header setIsDisconnected={setIsDisconnected} setAllServices={setAllServices} setAllCharacteristics={setAllCharacteristics}></Header>
      {isDisconnected ? null :
        <div className="container-fluid">
          <div className="container ">
            <div id='leafletMap' style={{ height: "300px" }}>
              <MapContainer ref={mapReference} center={[49.45949012762761, 11.08168398253593]} zoom={5} scrollWheelZoom={true} style={{ height: "300px" }}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LayersControl position='topright'>
                  <LayersControl.Overlay checked name="Event flip">
                    <LayerGroup>
                      {
                        allPointsArray.map(current => {
                          idFlipMarker += 1;
                          if (current.type === 'flipped'){
                            return (
                              <Marker position={current.location} icon={markerFlipIcon} alt={current.timestamp} id={idFlipMarker} eventHandlers={{ click: (e) => { setMarkerId(e.target.options.id); customRadius(chartReference.current) } }}>
                                <Tooltip>{current.timestamp + ' : ' + current.indication}</Tooltip>
                              </Marker>)
                          }
                        })
                      }
                    </LayerGroup>
                  </LayersControl.Overlay>
                  <LayersControl.Overlay checked name="Event open">
                    <LayerGroup>
                      {
                        allPointsArray.map(current => {
                          idOpenMarker += 1;
                          if (current.type === 'opened'){
                            return (
                              <Marker position={current.location} icon={markerOpenIcon} alt={current.timestamp} id={idOpenMarker} eventHandlers={{ click: (e) => { setMarkerId(e.target.options.id); customRadius(chartReference.current) } }}>
                                <Tooltip>{current.timestamp + ' : ' + current.indication}</Tooltip>
                              </Marker>)
                          }
                        })
                      }
                    </LayerGroup>
                  </LayersControl.Overlay>
                  <LayersControl.Overlay name="Temperature">
                    <LayerGroup>
                      {
                        allPointsArray.map(current => {
                          idTemperatureMarker += 1;
                          if (current.type === 'temperature'){
                            return (
                              <Marker position={current.location} icon={markerTempIcon} alt={current.timestamp} id={idTemperatureMarker} eventHandlers={{ click: (e) => { setMarkerId(e.target.options.id); customRadius(chartReference.current) } }}>
                                <Tooltip>{current.timestamp + ' : ' + current.temperature + '°C'}</Tooltip>
                              </Marker>)
                          }
                        })
                      }
                    </LayerGroup>
                  </LayersControl.Overlay>
                </LayersControl>
                <Polyline pathOptions={{ color: '#03234B' }} positions={pathPosition} />
              </MapContainer>
            </div>
            <div className="row">             
                    <div className="d-grid col-4 mt-1">
                      <button className="defaultButton" type="button" onClick={resetChartZoom} id="resetButton" style={{ float: 'right',margin: '0px' }}>Reset zoom</button>
                    </div>
                    <div className="d-grid col-4 mt-1">
                      <button className="defaultButton" type="button" style={{background: 'white', color: '#03234B', fontWeight: 'bold', border: 'white', margin: '0px' }}>Web Bluetooth® Interface</button>
                    </div>            
                    <div className="d-grid col-4 mt-1">
                      <button className="defaultButton" type="button" onClick={clear} id="clearButton" style={{ float: 'right',margin: '0px' }}>Clear</button>
                    </div>            
                </div>
            
            
            
            <div id='chartContainer'>
              <Line ref={chartReference} options={chartOptions} data={chartData}></Line>
            </div>
          </div>
        </div>
      }

    </div>
  );
}

export default App;
