'use strict';

// next to do - send guest insights.
var SIMULATE_ONLY = true
var airbnb = require('airbnbapijs')
var dateFormat = require('dateformat');
var fs = require('fs');
var util = require('util');
var deepcopy = require('deepcopy');
const fastcsv = require('fast-csv');  
const BASEPATH='\\airmessage\\'
const checkin_log_fn = `airdata\\sendmessage\\checkin_log.csv`


var tokens = ['123450bu',
              'BCDEFGHH' ]
var currs = ['USD',
              'EUR' ]
              
var sending = false

function dayadd(d, daysadd) {
  var d7 = new Date(d);
  d7.setDate( d7.getDate() + daysadd);
  return `${dateFormat(d7, "yyyy-mm-dd")}`
}


const send = require('gmail-send')({
  user: 'email1@gmail.com',
  pass: 'thepass',
  to:   'me@gmail.com'
});
const sendTivoli = require('gmail-send')({
  user: 'email1@gmail.com',
  pass: 'thepass',
  to:   'hey1@yahoo.com'
});

const sendSSQ = require('gmail-send')({
  user: 'email2@gmail.com',
  pass: 'thepass',
  to:   'hey2@yahoo.com'
});


const log = (v) => console.log(`${dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss")}:`,v)
const logerr = (v) => console.log(`${dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss")}: Error:`, v)
const datenow = `${dateFormat(Date.now(), "yyyy-mm-dd")}`
const datetimenow = `${dateFormat(Date.now(), "yyyy-mm-dd HH:MM:ss")}`
const dnow = Date.now()
const dbef = dayadd(dnow,-1)
const dtom = dayadd(dnow, 1)
const datebef = `${dateFormat(dbef, "yyyy-mm-dd")}`
const datetom = `${dateFormat(dtom, "yyyy-mm-dd")}`
const curr_time = `${dateFormat(dnow, "HH:MM")}`




async function send_message_admin() {
  if (!sending) return;
  if (d.check_in === datenow) {
    
    txt_kids=""
    txt_pets=""
    if (d.arrival_details_number_of_children>0 || d.arrival_details_number_of_infants>0) {
      txt_kids = 
`    adults: ` + d.arrival_details_number_of_adults + `<br>
children: ` + d.arrival_details_number_of_children + `<br>
infant: ` + d.arrival_details_number_of_infants + `<br>`
    }

    if (! d.is_bringing_pets === 'false' ) {
      txt_pets = 'Note: guest has pets <br>'
    }

    if (d.listing_name === '19N2' || d.listing_name === '20N2') 
      txt = '<br><b>Dear Great Homes admin:</b><br><br>'
    else
      txt = '<br><b>Dear Tivoli Hawaii admin:</b><br><br>'
      
    txt +=
`

We are expecting today:<br>

First name: ` + d.guest_first_name + `<br>
Last name: ` + d.guest_last_name + `<br>
Phone: ` + d.guest_phone + `<br>
From: ` + d.guest_location + `<br>
Guests: ` + d.number_of_guests + `<br>` + txt_kids + `
Arriving: `+ d.check_in + `<br>
Leaving: `+ d.check_out + `<br> ` +txt_pets+ `
Picture: <br><br>
<img src="`+ d.guest_picture_large_url +`" height="120" >

<br>
<br>
<br>
Thanks for accomodating.

` 


    if (d.listing_name === '92' || d.listing_name === '22') 
      await sendSSQ({
          subject: d.listing_name + ' guest ' + datenow,
          html: txt
      })
    else 
      await sendTivoli({
          subject: d.listing_name + ' guest ' + datenow,
          html: txt
      })
  }
}

async function readcsv(fn) {

  const splitEasy = require("csv-split-easy");
  const parse = require('csv-parse/lib/sync')
  
  var d = []
  var t = await fs.createReadStream(fn, 'utf-8')
  var headerline = ''
  var lastchunk = ''
  var headerlinelen = 0
  var lines
  
  for await (var chunk of t) {
    
    if (headerline === '') {
      lines = chunk.toString('utf8').split('\n');
      headerline = JSON.parse(JSON.stringify( lines[0] ));
      let source = splitEasy( lines[0]  );
      headerlinelen = source[0].length;
      console.log('headerline length=', headerlinelen)
    } else {
      chunk = headerline + '\n' + lastchunk + chunk;
      lines = chunk.toString('utf8').split('\n');
    }

    for (var i=1;i<lines.length;i++ ) {
      try {

        let source = splitEasy( lines[i]  );
        if (source[0].length < headerlinelen) {  // the data has been chunked and need to obtain next chunk
          console.log('  chunking encountered, partial data fields=',source[0].length,' expected=',headerlinelen)
          lastchunk = lines[i]          
          break
        }  

        try {
          const records = parse(lines[0]+'\n'+lines[i].replace('\r',''), {
            columns: true,
            skip_empty_lines: true,
            separator: ','
          })
            
          // the results is encased inside an array
          d.push(records[0] )
          
        } catch (e) {
          logerr("ERROR parsing CSV")
          logerr(e);
          logerr("line 0: >>" )
          logerr( lines[0] )
          logerr("line i: >>" )
          logerr( lines[i] )
          logerr("<<" )
          process.exit(1)
          
        }
      } catch (e) {
        logerr(e);
        logerr(lines[i] )
        process.exit(1)
        lastchunk = lines[i]
        // assume the data has been chunked 
        break
        let source = splitEasy( lines[i]  );
        console.log(source)
        process.exit(1);
      }
    }
  }
  console.log('parsed csv records',d.length)
  return d
}      


const csvPromise = function(fn) {
  return new Promise((resolve, reject) => {
    fs.readFile(fn, (err, fileData) => {
      csv(fileData, {}, function(err, rows) {
        console.log('rows', rows, err)
        resolve(rows) ;
      });
    });
  })  
}

const timeoutPromise = (time) => {
    return new Promise((resolve, reject) => { setTimeout(() =>
        { console.log('Timeout=',time); resolve('done') }, time) })
}


async function main() {
  var al1
  var all_send_results = []

  let argv=''
  // print process.argv
  process.argv.forEach(function (val, index, array) {
    console.log(index + ': ' + val);
    argv=val
  });

  if (argv === '-a') SIMULATE_ONLY = false
  
  
  try {
      var checkin_log = []
      let checkin_message_rules = require(BASEPATH + './airdata/sendmessage/checkin.json')
      checkin_log = await readcsv(BASEPATH + checkin_log_fn )
      
      
      for (let ii = 0; ii<tokens.length; ii++ ) {
        var setDefTok = airbnb.setDefaultToken(tokens[ii])
        var curr = await airbnb.setCurrency(currs[ii] );
        var data_reserves = []
        
        data_reserves = await readcsv(BASEPATH + `airdata\\res\\res_${ii}.csv`)
        
        for (let jj = 0; jj<data_reserves.length; jj++ ) {
          let row = data_reserves[jj]


          function templatefy (s) {
            let o = row
            s = s.toString()
            Object.keys(o).forEach(function(key) {
              var val = o[key];
              s = s.split('{{'+key+'}}').join(val)
            });
            return s;
          }
          
          var rule_cond = 0;
          
          if (typeof row === 'undefined') {
            log('we are here')
            break;
          }
          if (row.status === "cancelled") continue;
          
          if      (row.check_in  === datebef && row.check_out === datenow) rule_cond = 7;  // checkout day and checked in yesterday
          else if (row.check_in  === datenow && row.check_out === datetom) rule_cond = 8;
          else if (row.check_in  === datebef && row.check_out === datetom) rule_cond = 9;
          else if (row.check_in  === datenow ) rule_cond = 1;
          else if (row.check_in  === datebef ) rule_cond = 2;
          else if (row.check_in  === datetom ) rule_cond = 3;
          else if (row.check_out === datenow ) rule_cond = 4;
          else if (row.check_out === datebef ) rule_cond = 5;
          else if (row.check_out === datetom ) rule_cond = 6;
          
          
          for (var i=0; i<checkin_message_rules.length; i++) {
            
            // iterate the listings dict
            let o=checkin_message_rules[i].listings
            //await Object.keys(o).forEach(function(key) {
            for (var key in o) {
              var val = o[key];
              if (val === row.listing_name) {

                var cmr = checkin_message_rules[i]
                if (rule_cond == 6)
                  console.log('cmr.listing_name',cmr.listing_name)
                // check if this checkin item and checkin rule has been previously logged
                //   return true or false
                function ids_sent() {
                  var i = 0
                    
                  for (var i=0; i<checkin_log.length; i++) {
                    if ( typeof row.listing_name === 'undefined' ) continue;
                    
                    if ( checkin_log[i].listing_name === row.listing_name &&
                         parseInt(checkin_log[i].rule_cond) == rule_cond  &&
                         checkin_log[i].id == cmr.id &&
                         checkin_log[i].date == row.check_in )
                    return true;
                    
                  }
                  return false;
                }
                
                if (cmr.rule_cond != rule_cond) continue;
                if (val !== row.listing_name) continue;
                if ( ids_sent() ) continue;
                if (cmr.time > curr_time) continue;
                if (rule_cond == 6)
                  console.log('  -->',cmr.listing_name)
                
                
                console.log(`  -> ${cmr.id} will message = `, row.listing_name,
                  row.guest_first_name, row.guest_last_name)
                
                
                // process the body of message
                var b = cmr.action.body;
                var c = ''
                for (var j=0; j<b.length; j++ )    
                  c += '\n'+b[j].trim()
                c = templatefy(c)
                
                if (cmr.type === "email") {
                  const send = require('gmail-send')({
                    user: 'email2@gmail.com',
                    pass: 'thepass',
                    to:   cmr.action.to,
                    cc:   cmr.action.cc,
                    subject: templatefy( cmr.action.subject ),
                    html:    c
                  });                  
                  if (!SIMULATE_ONLY)  {
                    var m = await send();
                    all_send_results.push(m);
                    all_send_results.push(timeoutPromise(1000));
                  }
                } else {
                  if (!SIMULATE_ONLY) {
                    log(`row.thread_id ${row.thread_id}`)
                    log(`cmr.length ${checkin_message_rules.length}`)
                    let z = await airbnb.sendMessage({
                        id: row.thread_id,
                        message: c
                    }).then( v => { 
                         log(`sendMessage finished`);
                         console.log(v);
                    }).catch(e => console.log(e ) )
                    all_send_results.push(z);
                    all_send_results.push(timeoutPromise(900));
                  }
                }
                let aa = {
                    id : cmr.id,
                    listing_name: row.listing_name,
                    date: row.check_in,
                    message_sent: datetimenow,
                    rule_cond: rule_cond}
                    
                if (SIMULATE_ONLY) {
                  console.log("SIMULATE_ONLY run. The following records would have been logged.")
                  console.log(aa)
                }
                else {
                    console.log('checkin_log.push(aa)')
                    console.log(aa)
                    checkin_log.push(aa)
                }
              }
            } // end cmr.listings object loop
          }
        }
      }
      console.log('now logging')
      let ws2 = fs.createWriteStream(checkin_log_fn  );
      let fc = fastcsv  
        .write(checkin_log, { headers: true })
        .pipe(ws2);
        
      console.log(ws2)
      console.log('fc')
      console.log(fc)
      
      log('all_send_results')
      console.log(all_send_results)
      return Promise.all(all_send_results)
  } catch (e) {
    logerr(e);
    
    await send({
      subject: 'airmessage error' + e,  
      text:    'airmessage error' + e,  
    })
  } finally {
    Promise.all(all_send_results).then(results => {
        results.forEach(result => console.log('results resolved inside main inside finally',result) )
      })
    log("airmessage is done");
  }
  
}

main()
