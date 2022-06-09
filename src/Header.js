import React from "react";
import './styles/style.css';
import logoST from './images/st-logo.svg';

var myDevice;

const Header = (props) => {

    function connection() {
        console.log('Requesting Bluetooth Device...');
        myDevice = navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
            
            // filters: 
            // [{
            //     name: 'WB_ADV_EXT',
            //     name: 'P2PSRV1'
            // }],
            optionalServices: ['00001306-cc7a-482a-984a-7f2ed5b3e58f','0000fe40-cc7a-482a-984a-7f2ed5b3e58f']
        })
            .then(device => { 
                myDevice = device;
                myDevice.addEventListener('gattserverdisconnected', onDisconnected);
                return device.gatt.connect();
            })
            .then(server => {
                return server.getPrimaryServices();
            })
            .then(services => {
                console.log('HEADER - Getting Characteristics...');
                let queue = Promise.resolve();
                services.forEach(service => {
                    console.log(service);
                    // createLogElement(service, 3, 'SERVICE')
                    props.setAllServices((prevService) => [
                        ...prevService,
                        {
                            service
                        },
                    ]);
                    queue = queue.then(_ => service.getCharacteristics()
                        .then(characteristics => {
                            console.log(characteristics);
                            console.log('HEADER - > Service: ' + service.device.name + ' - ' + service.uuid);
                            characteristics.forEach(characteristic => {
                                props.setAllCharacteristics((prevChar) => [
                                    ...prevChar,
                                    {
                                        characteristic
                                    },
                                ]);
                                console.log('HEADER - >> Characteristic: ' + characteristic.uuid + ' ' + getSupportedProperties(characteristic));
                                // createLogElement(characteristic, 4 , 'CHARACTERISTIC')
                            });
                        }));
                });
                let buttonConnect = document.getElementById('connectButton');
                buttonConnect.innerHTML = "Connected";
                buttonConnect.disabled = true;
                props.setIsDisconnected(false);
                return queue;
            })
            .catch(error => {
                console.error(error);
            });
        
    }
    
    function getSupportedProperties(characteristic) {
    let supportedProperties = [];
    for (const p in characteristic.properties) {
        if (characteristic.properties[p] === true) {
            supportedProperties.push(p.toUpperCase());
            }
        }
    return supportedProperties.join(', ');
    }

    function disconnection() {
        console.log('HEADER - Disconnecting from Bluetooth Device...');
        myDevice.gatt.disconnect();
        document.getElementById('connectButton').disabled = false;
        document.getElementById('connectButton').innerHTML = 'Connect';
        props.setIsDisconnected(true);
        props.setAllServices([]);
        // document.location.href="/";
    }

    function onDisconnected() {
        console.log('HEADER - > Bluetooth Device disconnected');
        document.getElementById('connectButton').disabled = false;
        document.getElementById('connectButton').innerHTML = 'Connect';
        props.setIsDisconnected(true);
        props.setAllServices([]);
        // document.location.href="/";
      }
    
    return (
        <div className="container-fluid mb-2" id="header">
            <div className="container ">
                <div className="row">
                    {/* <div className="col-xs-6 col-sm-6 col-md-4 col-lg-3 p-2">
                        <img src={logoST} className="img-fluid rounded-start" alt="logo st"></img>
                    </div>
                    <div className="col-xs-12 col-sm-12 col-md-8 col-lg-9 p-2">
                        <h2 className="card-title">Web Bluetooth® Map</h2>
                        <p className="card-text">This is a demonstration of the Bluetooth® Low Energy Extended Advertising application using the API Web Bluetooth.</p>
                    </div> */}
                    <div>
                    <img style={{height: '50px', float: 'left'}} src={logoST} className="img-fluid rounded-start" alt="logo st"></img>
                    <h3 style={{textAlign: 'center', fontFamily: 'Arial', fontWeight: 'bold',marginTop: '12px'}}>STM32WB Bluetooth® LE - Advertising Extended</h3> 
                    </div>
                    
                </div>
                <div className="row">             
                    <div className="d-grid col-6 p-2">
                        <button className="defaultButton" type="button" onClick={connection} id="connectButton">Connect</button>
                    </div>
                    <div className="d-grid col-6 p-2">
                    <button className="defaultButton" type="button" onClick={disconnection}>Disconnect</button>
                    </div>            
                </div>
            </div>
        </div>        
    );
};

export default Header;
