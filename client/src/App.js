import React, { useEffect, useState, useRef } from "react";
import "./css/App.css";

import Axios from "axios";
import io from 'socket.io-client'
import { v4 as uuidv4 } from 'uuid';
import papi from './images/lit.png'
import Modal from "./components/modal/Modal";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Slide } from 'react-toastify';
import SomeChart from "./components/SomeChart";


function App() {
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [betAmount, setBetAmount] = useState(localStorage.getItem("local_storage_wager") || 100)
  const [autoPayoutMultiplier, setAutoPayoutMultiplier] = useState(localStorage.getItem("local_storage_multiplier") || 2)
  const [userData, setUserData] = useState(null);
  const [multiplier, setMultiplier] = useState(null)
  const [liveMultiplier, setLiveMultiplier] = useState('CONNECTING...')
  const [liveMultiplierSwitch, setLiveMultiplierSwitch] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [globalSocket, setGlobalSocket] = useState(null)
  const [betActive, setBetActive] = useState(false)
  const [crashHistory, setCrashHistory] = useState([])
  const [roundIdList, setRoundIdList] = useState([])
  const [bBettingPhase, setbBettingPhase] = useState(false)
  const [bettingPhaseTime, setBettingPhaseTime] = useState(-1)
  const [bBetForNextRound, setbBetForNextRound] = useState(false)
  const [hookToNextRoundBet, setHookToNextRoundBet] = useState(false)
  const [messageToTextBox, setMessageToTextBox] = useState("")
  const [chatHistory, setChatHistory] = useState()
  const [liveBettingTable, setLiveBettingTable] = useState()
  const [errorMessage, setErrorMessage] = useState('')
  const [authResponseMessage, setAuthResponseMessage] = useState('')
  const [globalTimeNow, setGlobalTimeNow] = useState(0)
  const [openModalLogin, setOpenModalLogin] = useState(false);
  const [openModalRegister, setOpenModalRegister] = useState(false);
  const [chartData, setChartData] = useState({ datasets: [], });
  const [chartOptions, setChartOptions] = useState({});
  const [chartSwitch, setChartSwitch] = useState(false)
  const [gamePhaseTimeElapsed, setGamePhaseTimeElapsed] = useState()
  const [startTime, setStartTime] = useState()
  const [streakList, setStreakList] = useState([])
  const [tenNumbers, setTenNumbers] = useState([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])

  const multiplierCount = useRef([])
  const timeCount_xaxis = useRef([])
  const realCounter_yaxis = useRef(5)

  // Socket.io setup
  useEffect(() => {
    retrieve();
    const socket = io.connect("http://localhost:3001")
    setGlobalSocket(socket)

    socket.on('news_by_server', function (data) {
      setAnnouncement(data);
    });

    socket.on("start_multiplier_count", function (data) {
      setGlobalTimeNow(Date.now())
      setLiveMultiplierSwitch(true)
    })

    socket.on("stop_multiplier_count", function (data) {
      setLiveMultiplier(data)
      setLiveMultiplierSwitch(false)

      setBetActive(false)
    })

    socket.on("update_user", function (data) {
      getUser()
    })

    socket.on("crash_history", function (data) {

      setCrashHistory(data)

      let temp_streak_list = []
      const new_data = data
      let blue_counter = 0
      let red_counter = 0

      for (let i = 0; i < data.length; i++) {
        if (new_data[i] >= 2) {
          blue_counter += 1
          red_counter = 0
          temp_streak_list.push(blue_counter)
        } else {
          red_counter += 1
          blue_counter = 0
          temp_streak_list.push(red_counter)
        }
      }
      setStreakList(temp_streak_list.reverse())
    })

    socket.on("get_round_id_list", function (data) {
      setRoundIdList(data.reverse())
    })

    socket.on("start_betting_phase", function (data) {
      setGlobalTimeNow(Date.now())
      setLiveMultiplier("Starting...")
      setbBettingPhase(true)
      setLiveBettingTable(null)
      setHookToNextRoundBet(true)
      retrieve_active_bettors_list()

      multiplierCount.current = []
      timeCount_xaxis.current = []
    })

    socket.on("receive_message_for_chat_box", (data) => {
      get_chat_history()
    })

    socket.on("receive_live_betting_table", (data) => {

      setLiveBettingTable(data)
      data = JSON.parse(data)
      setTenNumbers(Array((10 - data.length)).fill(2))
    })

    return () => {
      socket.disconnect();
    }
  }, []);

  // Define useEffects
  useEffect(() => {
    if (hookToNextRoundBet) {
      if (bBetForNextRound) {
        send_bet()
      } else {

      }
      setHookToNextRoundBet(false)
      setbBetForNextRound(false)
    }
  }, [hookToNextRoundBet])

  useEffect(() => {
    if ((betActive && (autoPayoutMultiplier <= liveMultiplier))) {
      userData.balance += betAmount * autoPayoutMultiplier
      auto_cashout_early()
      setBetActive(false)
    }
  }, [liveMultiplier])

  const buttonClick = () => {
    globalSocket.emit("clicked", { message2: Date.now() })
  }

  useEffect(() => {
    let gameCounter = null
    if (liveMultiplierSwitch) {
      setLiveMultiplier('1.00')

      gameCounter = setInterval(() => {
        let time_elapsed = (Date.now() - globalTimeNow) / 1000.0
        setGamePhaseTimeElapsed(time_elapsed)
        setLiveMultiplier((1.0024 * Math.pow(1.0718, time_elapsed)).toFixed(2))

        if (multiplierCount.current.length < 1) {
          multiplierCount.current = multiplierCount.current.concat([1])
          timeCount_xaxis.current = timeCount_xaxis.current.concat([0])
        }
        if (realCounter_yaxis.current % 5 == 0) {
          multiplierCount.current = multiplierCount.current.concat([(1.0024 * Math.pow(1.0718, time_elapsed)).toFixed(2)])
          timeCount_xaxis.current = timeCount_xaxis.current.concat([time_elapsed])
        }
        realCounter_yaxis.current += 1
      }, 1)
    }
    return () => {

      clearInterval(gameCounter)

    }
  }, [liveMultiplierSwitch]);

  useEffect(() => {
    let bettingInterval = null

    if (bBettingPhase) {

      bettingInterval = setInterval(() => {

        let time_elapsed = ((Date.now() - globalTimeNow) / 1000.0)
        let time_remaining = (5 - time_elapsed).toFixed(2)
        setBettingPhaseTime(time_remaining)
        if (time_remaining < 0) {
          setbBettingPhase(false)
        }
      }, 10)
    }
    return () => {

      clearInterval(bettingInterval)
      setBettingPhaseTime("Starting...")

    }
  }, [bBettingPhase]);

  useEffect(() => {
    if (bBetForNextRound) {

    } else {

    }
  }, [bBetForNextRound])

  useEffect(() => {
    localStorage.setItem("local_storage_wager", betAmount);
    localStorage.setItem("local_storage_multiplier", autoPayoutMultiplier);
  }, [betAmount, autoPayoutMultiplier])

  useEffect(() => {
    get_game_status()
    getUser()
    setChartSwitch(true)
    setStartTime(Date.now())
    let getChatHistoryTimer = setTimeout(() => get_chat_history(), 1000);
    let getActiveBettorsTimer = setTimeout(() => retrieve_active_bettors_list(), 1000);
    let getBetHistory = setTimeout(() => retrieve_bet_history(), 1000);

    return () => {
      clearTimeout(getChatHistoryTimer);
      clearTimeout(getActiveBettorsTimer);
      clearTimeout(getBetHistory);
    };
  }, [])

  useEffect(() => {

  }, [liveBettingTable])


  // Routes
  const API_BASE = 'http://localhost:4000'
  const register = () => {
    Axios({
      method: "POST",
      data: {
        username: registerUsername,
        password: registerPassword,
      },
      withCredentials: true,
      url: API_BASE + "/register",
    }).then((res) => {
      setAuthResponseMessage(res.data)

      if (res.data == "Username already exists") {
        return
      }
      Axios({
        method: "POST",
        data: {
          username: registerUsername,
          password: registerPassword,
        },
        withCredentials: true,
        url: API_BASE + "/login",
      }).then((res) => {
        setAuthResponseMessage(res.data)
        getUser()

        if (res.data === 'Login Successful') {
          setOpenModalRegister(false)
          registerAndLoginToast()

        }
      })
    });
  };

  const login = () => {
    Axios({
      method: "POST",
      data: {
        username: loginUsername,
        password: loginPassword,
      },
      withCredentials: true,
      url: API_BASE + "/login",
    }).then((res) => {
      setAuthResponseMessage(res.data)
      getUser()

      if (res.data === 'Login Successful') {
        setOpenModalLogin(false)
        loginToast()
      }
    })
  };

  const getUser = () => {
    Axios({
      method: "GET",
      withCredentials: true,
      url: API_BASE + "/user",
    }).then((res) => {
      setUserData(res.data);
    });
  };
  const logout = () => {
    Axios.get(API_BASE + "/logout", {
      withCredentials: true
    }).then(res => {
      getUser()
      logoutToast()
    })
  }

  const multiply = () => {
    Axios.get(API_BASE + "/multiply", {
      withCredentials: true
    }).then(res => {

      if (res.data !== "No User Authentication") {
        setUserData(res.data)
      }
    })
  }

  const generate = () => {
    Axios.get(API_BASE + "/generate_crash_value", {
      withCredentials: true
    }).then(res => {
      setMultiplier(res.data)
    })
  }

  const retrieve = () => {
    Axios.get(API_BASE + "/retrieve", {
      withCredentials: true
    }).then(res => {
      setMultiplier(res.data)
    })
  }

  const send_bet = () => {
    Axios({
      method: "POST",
      data: {
        bet_amount: betAmount,
        payout_multiplier: autoPayoutMultiplier,
      },
      withCredentials: true,
      url: API_BASE + "/send_bet",
    }).then(res => {
      setBetActive(true)
      userData.balance -= betAmount
      setUserData(userData)
    })
      .catch(err => {
        if (err.response) {
        }
      })
  }

  const calculate_winnings = () => {
    Axios.get(API_BASE + "/calculate_winnings", {
      withCredentials: true
    }).then(res => {
      getUser()
    })
  }

  const get_game_status = () => {
    Axios.get(API_BASE + "/get_game_status", {
      withCredentials: true
    }).then(res => {
      if (res.data.phase === 'betting_phase') {
        setGlobalTimeNow(res.data.info)
        setbBettingPhase(true)
      } else if (res.data.phase === 'game_phase') {
        setGlobalTimeNow(res.data.info)
        setLiveMultiplierSwitch(true)
      }
    })
  }

  const manual_cashout_early = () => {
    Axios.get(API_BASE + "/manual_cashout_early", {
      withCredentials: true
    }).then(res => {
      setUserData(res.data)
      setBetActive(false)
    })
  }

  const auto_cashout_early = () => {
    Axios.get(API_BASE + "/auto_cashout_early", {
      withCredentials: true
    }).then(res => {
      setUserData(res.data)
      setBetActive(false)
    })
  }

  const bet_next_round = () => {
    setbBetForNextRound(!bBetForNextRound) //
  };

  const send_message_to_chatbox = () => {
    Axios({
      method: "POST",
      data: {
        message_to_textbox: messageToTextBox
      },
      withCredentials: true,
      url: API_BASE + "/send_message_to_chatbox",
    }).then((res) => {
      setMessageToTextBox('')
    })
  };

  const get_chat_history = () => {
    Axios.get(API_BASE + "/get_chat_history", {
      withCredentials: true
    }).then(res => {
      setChatHistory(res.data)
    })
  }

  const retrieve_active_bettors_list = () => {
    Axios.get(API_BASE + "/retrieve_active_bettors_list", {
      withCredentials: true
    }).then(res => {

    })
  };

  const retrieve_bet_history = () => {
    Axios.get(API_BASE + "/retrieve_bet_history", {
      withCredentials: true
    }).then(res => {

    })
  };

  // Functions
  const handleKeyDownBetting = (e) => {
    if (e.key === 'Enter') {
      if (bBettingPhase) {
        send_bet()
      }
      else {
        bet_next_round()
      }
    }
  }

  const handleKeyDownChat = (e) => {
    if (e.key === 'Enter') {
      send_message_to_chatbox()
    }
  }

  const verifyBetAmount = (text) => {
    const validated = text.match(/^(\d*\.{0,1}\d{0,2}$)/)
    const re = /^[0-9\b]+$/;

    if (text === '' || re.test(text)) {
      setBetAmount(text)
    }
    if (text > userData.balance) {
      setErrorMessage("Bet greater than balance")
    } else {
      setErrorMessage('')
    }
  };

  const verifyMultiplierAmount = (text) => {
    const validated = text.match(/^(\d*\.{0,1}\d{0,2}$)/)
    if (validated) {
      setAutoPayoutMultiplier(text)
    }
  };
  
  // Define Toasts
  const loginToast = () => {
    toast.success('Login Successful', {
      position: "top-center",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
      progress: undefined,
      theme: "dark",
      transition: Slide
    });
  };

  const registerAndLoginToast = () => {
    toast.info('Account Created and Logged In', {
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
      progress: undefined,
      theme: "dark",
      transition: Slide
    });
  };

  const logoutToast = () => {
    toast.success('You have been logged out', {
      position: "top-center",
      autoClose: 2000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
      progress: undefined,
      theme: "dark",
      transition: Slide
    });
  };

  const temp_time = Date.now()

  useEffect(() => {
    const temp_interval = setInterval(() => {
      setChartSwitch(false)
      sendToChart()
    }, 1)

    return () => {
      clearInterval(temp_interval)
      setChartSwitch(true)
    }
  }, [chartSwitch])

  // Chart Data
  const sendToChart = () => {
    setChartData({
      labels: timeCount_xaxis.current,

      datasets: [
        {
          data: multiplierCount.current,
          backgroundColor: "rgba(75,192,192,0.2)",
          borderColor: "rgba(75,192,192,1)",
          color: "rgba(255, 255, 255,1)",

          pointRadius: 0,
          borderDash: [35, 5],
          lineTension: 0.1,
        },
      ],
    });
    setChartOptions({
      events: [],
      maintainAspectRatio: false,
      elements: {
        line: {
          tension: 0.1
        }
      },
      scales: {
        yAxes: {
          type: 'linear',

          title: {
            display: false,
            text: 'value'
          },
          min: 1,
          max: (liveMultiplier > 2 ? (liveMultiplier) : (2)),
          ticks: {
            color: "rgba(255, 255, 255,1)",
            maxTicksLimit: 5,
            callback: function (value, index, values) {
              if (value % 0.5 == 0) return (parseFloat(value)).toFixed(2)
            }
          },
          grid: {
            display: true,
            color: 'white'
          },
        },
        xAxes: {
          type: 'linear',
          title: {
            display: false,
            text: 'value'
          },
          max: (gamePhaseTimeElapsed > 2 ? (gamePhaseTimeElapsed) : (2)),
          ticks: {
            color: "rgba(255, 255, 255,1)",

            maxTicksLimit: 5,
            callback: function (value, index, values) {
              if (gamePhaseTimeElapsed < 10) {
                if (value % 1 == 0) return value
              } else {
                if (value % 10 == 0) return value
              }
            }
          },
          grid: {
            display: true,
            color: 'white'
          },
        },
      },
      plugins: {
        legend: { display: false },
      },
      animation: {
        x: {
          type: 'number',
          easing: 'linear',
          duration: 0,
          from: 5,
          delay: 0
        },
        y: {
          type: 'number',
          easing: 'linear',
          duration: 0,
          from: 5,
          delay: 0
        },
        loop: true,
      },
    }
    );
  }
  
  //JSX
  return (

    <div className="App">
      <div>
        <ToastContainer />

        <Modal trigger={openModalLogin} setTrigger={setOpenModalLogin}>
          <div className="login-modal" >
            <div>
              {authResponseMessage ? (<p class="err-msg">{authResponseMessage}</p>) : ('')}
              <h1>Login</h1>
            </div>
            <div class="form-group">
              <label>Username: </label>
              <input
                placeholder="Enter your username"
                onChange={(e) => setLoginUsername(e.target.value)}
              />
            </div>
            <div class="form-group">
              <label>Password:</label>
              <input
                placeholder="Enter your password"
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <div>
              <button className="modal-submit" onClick={login}>Submit</button><br />
            </div>
          </div>
        </Modal>
      </div>
      <div>
        <Modal trigger={openModalRegister} setTrigger={setOpenModalRegister}>

          <div className="login-modal" >
            <div>
              {authResponseMessage ? (<p class="err-msg">{authResponseMessage}</p>) : ('')}
              <h1>Register</h1>
            </div>
            <div class="form-group">
              <label>Username: </label>
              <input
                placeholder="Enter your username"
                onChange={(e) => setRegisterUsername(e.target.value)}
              />
            </div>
            <div class="form-group">
              <label>Password:</label>
              <input
                placeholder="Enter your password"
                onChange={(e) => setRegisterPassword(e.target.value)}
              />
            </div>
            <div>
              <button className="modal-submit" onClick={register}>Submit</button><br />
            </div>

            {registerUsername !== '' && registerUsername.length < 3 ? (<span className="register_errors">Username must have at least 3 characters</span>) : ('')} <br />
            {registerPassword !== '' && registerPassword.length < 3 ? (<span className="register_errors">Password must have at least 3 characters</span>) : ('')}
          </div>
          <div>
          </div>
        </Modal>
      </div>

      <nav className="navbar">
        <div className="container">
          <span className="logo">Crash Gambling Simulator</span>
          <ul className="nav">

            {(userData && userData !== "No User Authentication") ? (
              <>
                <li>
                  User: {userData.username}
                </li>
                <li>
                  Balance: {userData.balance.toFixed(2)}
                </li>
                <li>
                  <a href="#" onClick={logout}>Logout</a>
                </li>
              </>
            ) : (
              <>
                <li>
                  <a href="#" onClick={() => {
                    setOpenModalLogin(true)
                    setAuthResponseMessage('')
                  }}>Login</a>
                </li>
                <li>
                  <a href="#" onClick={() => {
                    setOpenModalRegister(true)
                    setAuthResponseMessage('')
                  }}>Register</a>
                </li>
              </>
            )}

          </ul>
        </div>
      </nav>

      <div className="grid-container-main">
        <div className="grid-elements" >

          {<div className="effects-box">
            <div className="basically-the-graph" style={{ height: '90%', width: '90%', position: "absolute", top: '12%' }}>
              {chartData ? (<SomeChart chartData={chartData} chartOptions={chartOptions} />) : ('')}
            </div>
            <div style={{ position: "absolute", zIndex: 12, top: '40%' }}>
              {(() => {
                if (bBettingPhase) {
                  return <h1>{bettingPhaseTime}</h1>
                } else {

                  return <h1 className={` ${!liveMultiplierSwitch && liveMultiplier !== 'Starting...' && liveMultiplier !== 'CONNECTING...' ? ("multipler_crash_value_message") : ("")}`}>{liveMultiplier !== "Starting..." ? (liveMultiplier + 'x') : ('Starting...')}</h1>
                }
              })()}
            </div>
          </div>}
        </div>

        <div className="grid-elements">
          {(userData && userData !== "No User Authentication") ? (
            <div>


              <h1 className="makeshift-input-group"> Bet Amount</h1>
              <input
                className="input_box"
                placeholder="Type Your Bet Amount"

                onChange={(e) => verifyBetAmount(e.target.value)}
                value={betAmount}
                disabled={betActive ? 'disabled' : null}
                onKeyDown={handleKeyDownBetting}
              />
              <br />

              <h1 className="makeshift-input-group" > Auto Cashout Multiplier</h1>
              <input
                className="input_box"
                placeholder="Payout Multiplier"
                onChange={(e) => verifyMultiplierAmount(e.target.value)}
                onKeyDown={handleKeyDownBetting}
                value={autoPayoutMultiplier}
                disabled={betActive ? 'disabled' : null}
              />

              <br />
              {bBettingPhase && !betActive ? (<button class="css-button css-button-3d css-button-3d--grey" onClick={send_bet}>Send Bet</button>) : (
                <>
                  {betActive ? (<div>
                    <button class="css-button css-button-3d css-button-3d--grey" onClick={manual_cashout_early}> {(betActive && liveMultiplier > 1) ? (<span>Cashout at {(liveMultiplier * betAmount).toFixed(2)}</span>) : ("Starting...")}</button>
                  </div>) : (<div>
                    <button class={`css-button css-button-3d css-button-3d--grey ${bBetForNextRound ? ('bet_for_next_round_active') : ('')}`} onClick={bet_next_round}>{bBetForNextRound ? ("Cancel Bet") : ("Bet Next round")} </button>
                  </div>)}
                </>
              )}
            </div>
          ) : (<h1 > <a href="#" onClick={() => {
            setOpenModalLogin(true)
            setAuthResponseMessage('')
          }}
            className="quickLoginOrRegister" > Login </a>
            or
            <a href="#" onClick={() => {
              setOpenModalRegister(true)
              setAuthResponseMessage('')
            }}
              className="quickLoginOrRegister" > Register </a>
            to place a bet</h1>)}
          <div style={{ color: 'red', fontWeight: 600, marginTop: '5px' }}>{errorMessage}</div>

        </div>
        <div className="grid-elements">Chat <br />
          <div className="chat-box-wrapper">
            <div className="chat-box-rectangle">
              {chatHistory ? (<>
                {
                  (chatHistory).map((message) => {

                    return <div className="individual-chat-message" key={uuidv4()}>
                      <span className="message_top">{message.the_username} </span>
                      <span className="message_top_time">{message.the_time} -&nbsp;
                        {message.the_date} </span> <br />
                      <span className="message_bottom">{message.message_body}</span>
                    </div>
                  })
                }
              </>) : (<h1>Loading Chat history </h1>)}
            </div>
          </div>

          {(userData && userData !== "No User Authentication") ? (<>
            <input
              className="input_box_for_chat"
              placeholder="Send A Message"
              onChange={(e) => setMessageToTextBox(e.target.value)}
              value={messageToTextBox}
              onKeyDown={handleKeyDownChat}
            />
            <br />
          </>) :
            (<h3>Log in to send a chat message</h3>)}

        </div>

        <div className="grid-elements">Crash History
          <div class="container-crash-history">

            <ul class="history-table">
              <li class="history-table-header">
                <div class="col col-1">Game Id</div>
                <div class="col col-2">Crash At</div>
                <div class="col col-3">Streak</div>
              </li>
              {crashHistory.slice(0).reverse().map((crash, index, array) => {
                return <div className="row-history-wrapper" key={uuidv4()}>
                  <li class={crash >= 2 ? ("table-row-blue") : ("table-row-red")}>
                    <div class="col col-1" >{roundIdList[index]} </div>
                    <div class="col col-2" >{crash}x</div>
                    <div class="col col-3" >{streakList[index]}</div>
                  </li>

                </div>
              })}

            </ul>
          </div>

        </div>
        <div className="grid-elements">Live Bets Tracker
          <ul class="active-bet-table">
            <li class="active-bet-table-header">
              <div class="col col-1">User</div>
              <div class="col col-2">Bet Amount</div>
              <div class="col col-3">Cashout Multiplier</div>
              <div class="col col-4">Profit</div>
            </li>
          </ul>
          <div>
            {(liveBettingTable && liveBettingTable !== "[]") ? (<>
              {
                JSON.parse(liveBettingTable).map((message) => {
                  return <div class="container-crash-history">
                    <ul class="active-bet-table">
                      <div className="row-bet-wrapper" key={uuidv4()}>
                        <li class={message.cashout_multiplier ? "table-row-green" : "table-row-blue"}>
                          <div class="col col-1">{message.the_username} </div>
                          <div class="col col-2">{message.bet_amount}</div>
                          <div class="col col-3" >{message.cashout_multiplier ? (message.cashout_multiplier) : ('--')}</div>
                          <div class="col col-4">{message.profit ? (message.profit.toFixed(2)) : ('--')}</div>
                        </li>
                      </div>
                    </ul>
                  </div>
                })
              }
            </>) : ('')}

            <div class="container-crash-history">
              <ul class="active-bet-table">

                {tenNumbers.map((someNumber, index, array) => {
                  return <div className="row-bet-wrapper" key={uuidv4()}>
                    <li class={"table-row-blue"}>
                      <div class="col col-1">-- </div>
                      <div class="col col-2">--</div>
                      <div class="col col-3" >--</div>
                      <div class="col col-4">--</div>
                    </li>
                  </div>
                })}

              </ul>
            </div>
            <div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}

export default App;

