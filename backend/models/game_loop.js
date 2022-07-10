const mongoose = require("mongoose");
const game_loop = new mongoose.Schema({
  round_number: {
    type: Number,
    default: 1
  },
  active_player_id_list: {
    type: [String],
    default: []
  },
  multiplier_crash: {
    type: Number,
    default: 0
  },
  b_betting_phase: {
    type: Boolean,
    default: false
  },
  b_game_phase: {
    type: Boolean,
    default: false
  },
  b_cashout_phase: {
    type: Boolean,
    default: false
  },
  time_now: {
    type: Number,
    default: -1
  },
  previous_crashes: {
    type: [Number],
    default: []
  },
  round_id_list: {
    type: [Number],
    default: []
  },
  chat_messages_list: {
    type: [],
    default: []
  },

});

module.exports = mongoose.model("game_loop", game_loop);
