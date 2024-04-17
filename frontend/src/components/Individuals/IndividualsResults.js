import './Individuals.css'
import '../../App.css'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { AuthContext } from '../context/AuthContext'
import { useAuth } from 'oidc-react'
import configData from '../../config.json'
import { useContext } from 'react'
import TableResultsIndividuals from '../Results/IndividualsResults/TableResultsIndividuals'

function IndividualsResults (props) {
  const [showLayout, setShowLayout] = useState(false)

  const [beaconsList, setBeaconsList] = useState([])

  const [error, setError] = useState(false)

  const [numberResults, setNumberResults] = useState(0)
  const [boolean, setBoolean] = useState(false)
  const [results, setResults] = useState([])
  const [show1, setShow1] = useState(false)
  const [show2, setShow2] = useState(false)
  const [show3, setShow3] = useState(false)

  const [resultsPerDataset, setResultsDataset] = useState([])
  const [resultsNotPerDataset, setResultsNotPerDataset] = useState([])

  const [timeOut, setTimeOut] = useState(false)

  const [logInRequired, setLoginRequired] = useState(false)

  const [messageLoginFullResp, setMessageLoginFullResp] = useState('')

  const [limit, setLimit] = useState(0)
  const [skip, setSkip] = useState(0)

  const [skipTrigger, setSkipTrigger] = useState(0)
  const [limitTrigger, setLimitTrigger] = useState(0)

  const [queryArray, setQueryArray] = useState([])
  const [arrayFilter, setArrayFilter] = useState([])

  const { getStoredToken, authenticateUser } = useContext(AuthContext)
  let queryStringTerm = ''

  let res = ''

  const auth = useAuth()
  let isAuthenticated = auth.userData?.id_token ? true : false

  useEffect(() => {
    const apiCall = async () => {
      if (isAuthenticated === false) {
        authenticateUser()
        const token = getStoredToken()

        if (token !== 'undefined' && token !== null) {
          isAuthenticated = true
        }
      }
      console.log("HELLLLLooooooo")
      let queryToUse = "";
      if (props.query !== null) {
        console.log(props.query)
        let queryToEdit = props.query
        // need to transform qiery if it has and or or in it
        // no validation for () or correctness at this time, just for sake of demo
        if (queryToEdit.includes('AND')) {
          // transform (sex=male) and (diseases.diseaseCode=%acute% or diseases.diseaseCode=iron deficiency anaemia)
          // into sex=male,#ordiseases.diseaseCode=%acute%,#ordiseases.diseaseCode=iron deficiency anaemia 

          // split text based on AND first (can only be one for now, but there could be support for more complex queries later)
          // see which side has OR
          queryToEdit = queryToEdit.replaceAll('(', '')
          queryToEdit = queryToEdit.replaceAll(')', '')

          console.log("Query " + queryToEdit)
          const members = queryToEdit.split("AND"); 

          if(members.length > 2) {
            // error for now
          }
          
          console.log(members)

          let orSet = [];
          let andSet = [];
          if(members[0].includes("or") && members[1].includes("or")) {
            orSet = members[0].split("or");
            orSet = orSet.concat(members[1].split("or"))
          } 
          else if(members[0].includes("or")) {
              orSet = members[0].split("or");
              andSet = members[1].split("and");
          }
          else if(members[1].includes("or")) {
              orSet = members[1].split("or");
              andSet = members[0].split("and");
          }
          else {
            // there are no or or and in either
            andSet = members[0].split("and");
            andSet = andSet.concat(members[1].split("and"))
          }

          console.log("OR " + orSet)
          console.log("AND " + andSet)
          
          let trimmed_or = orSet.map(s => s.trim());
          let trimmed_and = andSet.map(s => s.trim());

          let newQuery = ''
          let newQuery2 = ''

          if(trimmed_and.length > 0) {
            newQuery = trimmed_and.join(",");
          }

          if(trimmed_or.length > 1) {
            newQuery2 = ",#or" + trimmed_or.join(",#or");
          }
          else if(trimmed_or[0] !== undefined) {
            newQuery2 = ",#or" + trimmed_or[0];
          }

          if(newQuery.charAt(0)=== ',') {
            newQuery = newQuery.substring(1);
          }

          if(newQuery == '' && newQuery2.charAt(0)=== ',') {
            newQuery2 = newQuery2.substring(1);
          }

          // if the structure is (1 or 2 or 3) and (3 or 4 or 5), that will need to be split into 2 queries and then results will need to merge
          newQuery += newQuery2; 
          // if the structure is (1 and 2 and 3) and (5 or 6) that can run as a single query
          console.log(newQuery)
          queryToUse= newQuery; 
        }
        else if (queryToEdit.includes('or') && !queryToEdit.includes('and')) {
          queryToEdit = queryToEdit.replaceAll('(', '')
          queryToEdit = queryToEdit.replaceAll(')', '')

          console.log("Query " + queryToEdit)
          let members_or = queryToEdit.split("or"); 
          let members = members_or.map(s => s.trim());
          let newQuery = ''
          if(members.length > 1) {
            newQuery = "#or" + members.join(",#or");
          }
          console.log(newQuery)
          queryToUse= newQuery; 
        }


        if (props.query.includes(',') || queryToUse.includes(',')) {
          if(queryToUse.includes(',')) {
            queryStringTerm = queryToUse.split(',')
          }
          else {
            queryStringTerm = props.query.split(',')
          }
          queryStringTerm.forEach((element, index) => {
            element = element.trim()
            if (
              element.includes('=') ||
              element.includes('>') ||
              element.includes('<') ||
              element.includes('!') ||
              element.includes('%')
            ) {
              if (element.includes('=')) {
                queryArray[index] = element.split('=')
                queryArray[index].push('=')
              } else if (element.includes('>')) {
                queryArray[index] = element.split('>')
                queryArray[index].push('>')
              } else if (element.includes('<')) {
                queryArray[index] = element.split('<')
                queryArray[index].push('<')
              } else if (element.includes('!')) {
                queryArray[index] = element.split('!')
                queryArray[index].push('!')
              } else {
                queryArray[index] = element.split('%')
                queryArray[index].push('%')
              }
              const alphaNumFilter = {
                id: queryArray[index][0],
                operator: queryArray[index][2],
                value: queryArray[index][1]
              }
              arrayFilter.push(alphaNumFilter)
            } else {
              const filter2 = {
                id: element,
                includeDescendantTerms: props.descendantTerm
              }
              arrayFilter.push(filter2)
            }
          })
        } else {
          if (
            props.query.includes('=') ||
            props.query.includes('>') ||
            props.query.includes('<') ||
            props.query.includes('!') ||
            props.query.includes('%')
          ) {
            if (props.query.includes('=')) {
              queryArray[0] = props.query.split('=')
              queryArray[0].push('=')
            } else if (props.query.includes('>')) {
              queryArray[0] = props.query.split('>')
              queryArray[0].push('>')
            } else if (props.query.includes('<')) {
              queryArray[0] = props.query.split('<')
              queryArray[0].push('<')
            } else if (props.query.includes('!')) {
              queryArray[0] = props.query.split('!')
              queryArray[0].push('!')
            } else {
              queryArray[0] = props.query.split('%')
              queryArray[0].push('%')
            }

            const alphaNumFilter = {
              id: queryArray[0][0],
              operator: queryArray[0][2],
              value: queryArray[0][1]
            }
            arrayFilter.push(alphaNumFilter)
          } else {
            const filter = {
              id: props.query
            }
            arrayFilter.push(filter)
          }
        }
      }

      try {
              console.log("HELLLLLooooooo2")
        let res = await axios.get(configData.API_URL + '/info')

        beaconsList.push(res.data.response)

        if (props.query === null) {
          // show all individuals

          var jsonData1 = {
            meta: {
              apiVersion: '2.0'
            },
            query: {
              filters: arrayFilter,
              includeResultsetResponses: `${props.resultSets}`,
              pagination: {
                skip: 0,
                limit: 0
              },
              testMode: false,
              requestedGranularity: 'record'
            }
          }
          jsonData1 = JSON.stringify(jsonData1)
          console.log("HELLLLLLOOOOOO")
          console.log(jsonData1);
          console.log(configData.API_URL)

          let token = null
          if (auth.userData === null) {
            token = getStoredToken()
          } else {
            token = auth.userData.access_token
          }

          if (token === null) {
            res = await axios.post(
              configData.API_URL + '/individuals',
              jsonData1
            )
          } else {
            const headers = { Authorization: `Bearer ${token}` }

            res = await axios.post(
              configData.API_URL + '/individuals',
              jsonData1,
              { headers: headers }
            )
          }
          setTimeOut(true)
          console.log("Response is: ")
          console.log(JSON.stringify(res))
          if (
            res.data.responseSummary.numTotalResults < 1 ||
            res.data.responseSummary.numTotalResults === undefined
          ) {
            console.log("are there no resutls?")
            console.log(res.data.responseSummary.numTotalResults)
            setError('ERROR. Please check the query and retry')
            setNumberResults(0)
            setBoolean(false)
          } else {
            res.data.response.resultSets.forEach((element, index) => {
              if (element.id && element.id !== '') {
                if (resultsPerDataset.length > 0) {
                  resultsPerDataset.forEach(element2 => {
                    element2[0].push(element.id)
                    element2[1].push(element.exists)
                    element2[2].push(element.resultsCount)
                  })
                } else {
                  let arrayResultsPerDataset = [
                    //element.beaconId,
                    [element.id],
                    [element.exists],
                    [element.resultsCount]
                  ]
                  resultsPerDataset.push(arrayResultsPerDataset)
                }
              }

              if (element.id === undefined || element.id === '') {
                let arrayResultsNoDatasets = [element.beaconId]
                resultsNotPerDataset.push(arrayResultsNoDatasets)
              }

              if (res.data.response.resultSets[index].results) {
           
                res.data.response.resultSets[index].results.forEach(
                  (element2, index2) => {
                    let arrayResult = [
                      res.data.meta.beaconId,
                      res.data.response.resultSets[index].results[index2]
                    ]
                    results.push(arrayResult)
                  }
                )
              }
            })
          }
        } else {
          var jsonData2 = {
            meta: {
              apiVersion: '2.0'
            },
            query: {
              filters: arrayFilter,
              includeResultsetResponses: `${props.resultSets}`,
              pagination: {
                skip: skip,
                limit: limit
              },
              testMode: false,
              requestedGranularity: 'record'
            }
          }
          jsonData2 = JSON.stringify(jsonData2)
          console.log("HELLLLLLOOOOOO")
          console.log(jsonData2);
          console.log(configData.API_URL)
          let token = null
          if (auth.userData === null) {
            token = getStoredToken()
          } else {
            token = auth.userData.access_token
          }

          if (token === null) {
            console.log('Querying without token')
            res = await axios.post(
              configData.API_URL + '/individuals',
              jsonData2
            )
          } else {
            console.log('Querying WITH token')
            const headers = { Authorization: `Bearer ${token}` }
            res = await axios.post(
              configData.API_URL + '/individuals',
              jsonData2,
              { headers: headers }
            )
          }
          setTimeOut(true)

          if (
            res.data.responseSummary.numTotalResults < 1 ||
            res.data.responseSummary.numTotalResults === undefined
          ) {
            setError('ERROR. Please check the query and retry')
            setNumberResults(0)
            setBoolean(false)
          } else {
            res.data.response.resultSets.forEach((element, index) => {
            
              if (element.id && element.id !== '') {
   
                if (resultsPerDataset.length > 0) {
                  resultsPerDataset.forEach(element2 => {
              
                    element2[0].push(element.id)
                    element2[1].push(element.exists)
                    element2[2].push(element.resultsCount)
                  })
                } else {
                  let arrayResultsPerDataset = [
                    //element.beaconId,
                    [element.id],
                    [element.exists],
                    [element.resultsCount]
                  ]
       
                  resultsPerDataset.push(arrayResultsPerDataset)
                }
              }

              if (element.id === undefined || element.id === '') {
                let arrayResultsNoDatasets = [element.beaconId]
                resultsNotPerDataset.push(arrayResultsNoDatasets)
              }

              if (res.data.response.resultSets[index].results) {
         
                res.data.response.resultSets[index].results.forEach(
                  (element2, index2) => {
                    let arrayResult = [
                      res.data.meta.beaconId,
                      res.data.response.resultSets[index].results[index2]
                    ]
                    results.push(arrayResult)
                  }
                )
              }
            })
          }
        }
      } catch (error) {
        setError('Connection error. Please retry')
        console.log(error)
        setTimeOut(true)
      }
    }
    apiCall()
  }, [])

  const handleTypeResults1 = () => {
    setShow1(true)
    setShow2(false)
    setShow3(false)
  }

  const handleTypeResults2 = () => {
    setShow2(true)
    setShow1(false)
    setShow3(false)
  }

  const handleTypeResults3 = () => {
    setShow3(true)
    setShow1(false)
    setShow2(false)
  }
  const onSubmit = () => {
    setSkipTrigger(skip)
    setLimitTrigger(limit)
    setTimeOut(false)
  }
  return (
    <div>
      {timeOut === false && (
        <div className='loaderLogo'>
          <div className='loader2'>
            <div id='ld3'>
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div>
          {' '}
          {timeOut && error !== 'Connection error. Please retry' && (
            <div>
              <div className='selectGranularity'>
                <h4>Granularity:</h4>
                <button className='typeResults' onClick={handleTypeResults1}>
                  <h5>Boolean</h5>
                </button>
                <button className='typeResults' onClick={handleTypeResults2}>
                  <h5>Count</h5>
                </button>
                <button className='typeResults' onClick={handleTypeResults3}>
                  <h5>Full response</h5>
                </button>
              </div>
            </div>
          )}
          {timeOut && error === 'Connection error. Please retry' && (
            <h3>&nbsp; {error} </h3>
          )}
          {show3 && logInRequired === false && !error && (
            <div className='containerTableResults'>
              <TableResultsIndividuals
                show={'full'}
                results={results}
                resultsPerDataset={resultsPerDataset}
                beaconsList={beaconsList}
                resultSets={props.resultSets}
              ></TableResultsIndividuals>
            </div>
          )}
          {show3 && error && <h3>&nbsp; {error} </h3>}
          {show2 && !error && (
            <div className='containerTableResults'>
              <TableResultsIndividuals
                show={'count'}
                resultsPerDataset={resultsPerDataset}
                resultsNotPerDataset={resultsNotPerDataset}
                results={results}
                beaconsList={beaconsList}
                resultSets={props.resultSets}
              ></TableResultsIndividuals>
            </div>
          )}
          {show1 && !error && (
            <div className='containerTableResults'>
              <TableResultsIndividuals
                show={'boolean'}
                resultsPerDataset={resultsPerDataset}
                resultsNotPerDataset={resultsNotPerDataset}
                results={results}
                beaconsList={beaconsList}
                resultSets={props.resultSets}
              ></TableResultsIndividuals>
            </div>
          )}
          {show2 && error && <h3>&nbsp; {error} </h3>}
          {show1 && error && <h3>&nbsp; {error} </h3>}
        </div>
      </div>
    </div>
  )
}

export default IndividualsResults
