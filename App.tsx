import React, { useEffect, useState } from 'react';
import {Text, View, ScrollView, StyleSheet, Dimensions, FlatList, StyleProp, ViewStyle, VirtualizedList, Alert, NativeTouchEvent, TouchableOpacity} from 'react-native';
import { SafeAreaView , SafeAreaProvider} from 'react-native-safe-area-context';
import Svg, {Line, Path, SvgUri, SvgXml} from 'react-native-svg';
import Mapsvg from './mintytram2c.svg';
import Tramicon from './tramicon.svg';
import Tramnorth from './tramicon-north.svg';
import Tramsouth from './tramicon-south.svg';
import { Marquee } from '@animatereactnative/marquee';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TouchableWithoutFeedback } from 'react-native';
//import { err } from 'react-native-svg/lib/typescript/xml';

const map = require('./coords.json');
const station_locations = require('./coords_station.json');
const start_time = new Date().getTime();

type Tram = {
  departed: string,
  predictNext: string,
  destination: string,
  route: string,
  dTime: string,
  currentTime: string,
  totalTime: string,
  progress: number,
  minuteOffset: number
}

const windowDimensions = Dimensions.get('window');
const scaling = {
  width: windowDimensions.width/100,
  height: windowDimensions.width/100,
  woffset: -7.5,
  hoffset: -7.5
}; // -7.5, 12.5

/*
const Trams = () => {
  useEffect(() => {
    fetch('http://3.10.246.250:3000/active')
    .then((res) => res.json())
    .then()
  })
}
*/

/*
function touchTram() {
  console.log("tram touch");
}
  */

const invalidNotice = ["END OF SERVICE", "TravelSafe"];

function invalidFilter(notice:string) {
  let found = true;
  invalidNotice.forEach(invalid => {
    if (notice.includes(invalid)) {
      found = false;
    }
  });
  return found;
}

function getLength(path: Array<string>) {
  let rLength = 0;
  path.forEach(segment => {
    switch (segment[0]) {
      case 'm':
        break;
      case 'h':
      case 'v':
        rLength += Math.abs(+segment.slice(1));
        break;
      case 'r':
      case 'd':
        rLength += Math.abs(+ (Math.abs(+segment.slice(1).split(' ')[0]) * Math.PI / 2));
        break;
    }
  });
  return rLength;
}


function getColour(c:boolean){
  switch(c) {
    case true:
      return 'green';
    case false:
      return 'orange';
  }
}

function getText(c:boolean) {
  switch(c) {
    case true:
      if (new Date().getTime() < (start_time + 7000)) {
        return 'Tap here to expand notices and licence';
      } else {
        return 'Connected';
      }
    case false:
      return 'Can\'t connect to server.';
  }
}

function getDirection(tram: any) {
  // 0 north
  // 1 south
  // 2 other
  let path:Array<string>;
  try {
    path = map[tram.departed][tram.predictNext];
    if (path == undefined) {
      path = map[tram.predictNext][tram.departed];
      if (path == undefined) {
        return 2;
      } else {
        return 0;
      }
    } else {
      return 1;
    }
    
  } catch {
    return 2;
  }
}

function getPosition(tram: any) {
  let output:StyleProp<ViewStyle> = {
    position:'absolute',
    top:'0%',
    left:'0%',
    pointerEvents:'none'
  };
  let path:Array<string>;
  let percent,length:number;
  percent = tram.progress;
  try {
    path = map[tram.departed][tram.predictNext];
    if (path == undefined) {
      percent = 1 - percent;
      path = map[tram.predictNext][tram.departed];
      if (path == undefined) {
        path = ["m100 600"];
      }
    }
    
  } catch {
    // console.log('FUCK');
    path = ["m100 600"];
    percent = 0;
  }
  // percent = 1;
  // console.log(path);
  length = getLength(path);
  length = length * percent; 
  let x = 0,y=0;
  path.forEach(segment => {
    let movement,smLength,cx,cy;
    switch (segment[0]) {
      case 'm':
        x = +segment.slice(1).split(' ')[0];
        y = +segment.slice(1).split(' ')[1];
        break;
      case 'h':
        movement = Math.sign(+segment.slice(1)) * Math.min(Math.abs(+segment.slice(1)),length);
        x += movement;
        length -= Math.abs(movement);
        break;
      case 'v':
        movement = Math.sign(+segment.slice(1)) * Math.min(Math.abs(+segment.slice(1)),length);
        y += movement;
        length -= Math.abs(movement);
        break;
      case 'r':
        cx = +segment.slice(1).split(' ')[0];
        cy = +segment.slice(1).split(' ')[1];
        smLength = Math.abs(+ (+cx * Math.PI / 2));
        movement = Math.min(smLength,length);
        /*angle = Math.sin(((movement / smLength)*Math.PI)-Math.PI/2)/2 + 0.5;
        angle = Math.sin(((movement / smLength)*Math.PI)/2);*/
        x = x + (cx * Math.sin(((movement / smLength)*Math.PI)/2));
        y = y + (cy * (Math.sin((((movement / smLength)*Math.PI)/2)-(Math.PI/2))+1));
        length -= movement;
        break;
      case 'd':
        cx = +segment.slice(1).split(' ')[0];
        cy = +segment.slice(1).split(' ')[1];
        smLength = Math.abs(+ (+cx * Math.PI / 2));
        movement = Math.min(smLength,length);
        /*angle = Math.sin(((movement / smLength)*Math.PI)-Math.PI/2)/2 + 0.5;
        angle = Math.sin(((movement / smLength)*Math.PI)/2);*/
        y = y + (cy * Math.sin(((movement / smLength)*Math.PI)/2));
        x = x + (cx * (Math.sin((((movement / smLength)*Math.PI)/2)-(Math.PI/2))+1));
        length -= movement;
        break;
    }
  })
  /*output.left = x + '%';
  output.top = y + '%';*/
  output.left = (x * scaling.width) + scaling.woffset;
  output.top = (y * scaling.height) + scaling.hoffset;
  return output;
}


function Tramout(tram: any, index: number) {
  switch (getDirection(tram)) {
    case 0:
      return <Tramnorth key={index} width={15} height={15} style={getPosition(tram)}/>
    case 1:
      return <Tramsouth key={index} width={15} height={15} style={getPosition(tram)}/>
    case 2:
      return <Tramicon key={index} width={15} height={15} style={getPosition(tram)}/>
  }
}



/*
function createStations(station_id:string) {
  let left_w = parseInt(station_locations[station_id][0]) * scaling.width + scaling.woffset;
  let top_w = parseInt(station_locations[station_id][1]) * scaling.height + scaling.hoffset;
  

  return <TouchableWithoutFeedback key={station_id} onPress={() => showStationInformation.bind(station_id)}><Tramicon width={20} height={20} style={{position:"absolute", top:top_w,left:left_w}}></Tramicon></TouchableWithoutFeedback>
}
*/

const App = () => {
  const [trams, setTrams] = useState([]);
  const [connected, setConnected] = useState(true);
  const [notices, setNotices] = useState([]);
  const [expandNotice, setExpandNotice] = useState(true);
  const [lastTouch, setLastTouch] = useState<NativeTouchEvent>();
  const [viewingStation, setViewingStation] = useState("");
  const [stationInformation, setStationInformation] = useState<any>([]);
  useEffect(() => {
    setInterval(() => {
      //console.log(viewingStation);
       {
        fetch('http://tram.mintyasleep.net:3000/active')
        .then((res) => res.json())
        .then((data) => {
          setTrams(data);
          setConnected(true);
          //console.log('data fetched successfully')
        }) 
        .catch((err) => {
          setConnected(false);
          console.log(err.message);
        });
      } 

      fetch('http://tram.mintyasleep.net:3000/notice')
      .then((res) => res.json())
      .then((data) => {
        //setNotices(data.filter((notice:string) => !notice.includes("END OF SERVICE") && !notice.includes("TravelSafe")));
        setNotices(data.filter(invalidFilter));
        //console.log('notice fetched successfully')
      }) 
      .catch((err) => {
        console.log(err.message);
      });

    },5000);
  }, []);


  const expand = () => {
    setExpandNotice(!expandNotice);
  }

  const closeStation = () => {
    setViewingStation("");
  }

  const showStationInformation = () => {
    let directions = Object.keys(stationInformation);
    if (directions.length == 4) {
      let sortedUpcoming = stationInformation[directions[0]].concat(stationInformation[directions[1]]).concat(stationInformation[directions[2]]).concat(stationInformation[directions[3]]);
      sortedUpcoming.sort((a:any, b:any) => parseFloat(a.Wait) - parseFloat(b.Wait));
      console.log(sortedUpcoming);

      return sortedUpcoming.map((this_tram:any,index:number) => <View key={index} style={{borderColor:"white",borderWidth:2}}>
      <View style={{flex:1,alignSelf:"stretch",flexDirection:"row"}}><View style={{flex:2,alignSelf:"stretch"}}><Text style={{color:"white"}}>{this_tram.Dest}</Text></View><View style={{flex:1,alignSelf:"stretch"}}><Text style={{color:"white",textAlign:"right"}}>{this_tram.Wait}</Text></View></View>
      <View style={{flex:1,alignSelf:"stretch",flexDirection:"row"}}><View style={{flex:2,alignSelf:"stretch"}}><Text style={{color:"white"}}>{this_tram.Carriages}</Text></View><View style={{flex:1,alignSelf:"stretch"}}><Text style={{color:"white",textAlign:"right"}}>{this_tram.Status}</Text></View></View>
      </View>);
    } else {
      return <View></View>
    }

  }

  const checkTouch = (evt:NativeTouchEvent) => {
    if (lastTouch != undefined) {
      //console.log("  Xdif:" + (evt.locationX-lastTouch.locationX) + " Ydif:" + (evt.locationY-lastTouch.locationY));
      //console.log("    XY:" + evt.locationX + "," + evt.locationY);
      //console.log("normXY:" + ((evt.locationX - scaling.woffset) / scaling.width) + "," + ((evt.locationY - scaling.hoffset) / scaling.height));
      let normX = ((evt.locationX - scaling.woffset) / scaling.width);
      let normY = ((evt.locationY - scaling.hoffset) / scaling.height);
      if (((evt.locationX - lastTouch.locationX)**2 + (evt.locationY - lastTouch.locationY)**2) <=25) {
        console.log("checking");
        let stationTapped = "";
        let minDistance = 101;
        Object.keys(station_locations).forEach(station_id => {
          let distance = ((normX - parseFloat(station_locations[station_id][0]))**2 + (normY - parseFloat(station_locations[station_id][1]))**2);
          if (distance <=100) {
            console.log(station_id + distance);
            if (distance < minDistance) {
              stationTapped = station_id;
              minDistance = distance;
            }
          }
        });
        setViewingStation(stationTapped);
        console.log('http://tram.mintyasleep.net:3000/stations/' + stationTapped.replaceAll(" ","_"));
        fetch('http://tram.mintyasleep.net:3000/stations/' + stationTapped.replaceAll(" ","_"))
        .then((res) => res.json())
        .then((data) => {
          //console.log(data);
          setStationInformation(data);
        }) 
        .catch((err) => {
          console.log(err.message);
        });
      }

    }
  }

  return (
    <SafeAreaProvider style={{backgroundColor: "#000000"}}>
    <SafeAreaView edges={["top","left","right"]} style={{backgroundColor: '#000'}}>
      <TouchableWithoutFeedback onPress={expand}>
      <GestureHandlerRootView style={{
        backgroundColor: expandNotice ? getColour(connected) : "black",
        width: '100%',
        //height: 20
        height: (expandNotice ? 40 : '100%')
      }}>
        
        <Text style={{textAlign: 'center',color:"#f0f0f0"}}>{getText(connected)}</Text>
        <Marquee spacing={20} speed={0.5} withGesture={true} style={{display: expandNotice ? undefined : 'none'}}><Text style={{textAlign: 'center',color:"#f0f0f0"}}>{notices.map(x => x + " // ")}</Text></Marquee>
        <Text style={{textAlign: 'center',color:"#f0f0f0",display:!expandNotice ? undefined : 'none'}}>{(notices.map(x => "\n" + x + "\n")).join("") + "\n--\n\ntramapp by mintyasleep\ncontact: alicja.work@protonmail.com\n\nContains public sector information licensed under the Open Government Licence v3.0."}</Text>
      </GestureHandlerRootView>
      </TouchableWithoutFeedback>
      <ScrollView onTouchStart={(evt) => {setLastTouch(evt.nativeEvent)}} onTouchEnd={(evt) => {checkTouch(evt.nativeEvent)}} style={{backgroundColor: "#FFF", display:viewingStation == "" ? undefined : 'none'}}>
        {/*<Text style={{color:'#000000'}}>{windowDimensions.height},{windowDimensions.width},{windowDimensions.scale}</Text>*/}
        <Mapsvg width={windowDimensions.width} height={windowDimensions.width*6}/>
        {trams.map((item, index) => Tramout(item,index))}
        {/*Object.keys(station_locations).map((item) => createStations(item))*/}
        {/*<Text style={{color:'black'}}>{JSON.stringify(trams)}</Text>*/}
      </ScrollView>
      <ScrollView style={{display:viewingStation != "" ? undefined : 'none'}} onTouchEnd={closeStation}>
        <Text style={{color:"white", textAlign:"center" }}>{viewingStation}</Text>
        {showStationInformation()}

        <Text style={{color:"white"}}>
          {/*JSON.stringify(stationInformation)*/}
        </Text>
      </ScrollView>
    </SafeAreaView>
    </SafeAreaProvider>
  );
};
/*
const getItem = (data:any,index:number) => {
  return {
    id: index,

  }
}
*/
const styles = StyleSheet.create({
  text: {
    fontSize: 40,
  }
});

export default App;