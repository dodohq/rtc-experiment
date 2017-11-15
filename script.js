if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  location.protocol = 'https:';
}

var localVideo = null,
  remoteVideo = null,
  localVideoStream = null,
  videoCallButton = null,
  endCallButton = null,
  peerConn = null,
  peerConnCfg = {
    iceServers: [
      { url: 'stun:stun.services.mozilla.com' },
      { url: 'stun:stun.l.google.com:19302' },
    ],
  },
  socketProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
wsc = new WebSocket(socketProtocol + '//' + window.location.host);

function onIceCandidateHandler(e) {
  if (!e || !e.candidate) return;
  wsc.send(JSON.stringify({ candidate: e.candidate }));
}

function onAddStreamHandler(e) {
  videoCallButton.setAttribute('disabled', true);
  endCallButton.removeAttribute('disabled');
  remoteVideo.src = URL.createObjectURL(e.stream);
}

function prepareCall() {
  peerConn = new RTCPeerConnection(peerConnCfg);
  peerConn.onicecandidate = onIceCandidateHandler;
  peerConn.onaddstream = onAddStreamHandler;
}

function createAndSendOffer() {
  peerConn.createOffer(
    function(offer) {
      var off = new RTCSessionDescription(offer);
      peerConn.setLocalDescription(
        off,
        function() {
          wsc.send(JSON.stringify({ sdp: off }));
        },
        function(err) {
          console.log(err);
        },
      );
    },
    function(err) {
      console.log(err);
    },
  );
}

function createAndSendAnswer() {
  peerConn.createAnswer(
    function(answer) {
      var ans = new RTCSessionDescription(answer);
      peerConn.setLocalDescription(
        ans,
        function() {
          wsc.send(JSON.stringify({ sdp: ans }));
        },
        function(err) {
          console.log(err);
        },
      );
    },
    function(err) {
      console.log(err);
    },
  );
}

function initiateCall() {
  prepareCall();
  navigator.getUserMedia(
    { audio: true, video: true },
    function(stream) {
      localVideoStream = stream;
      localVideo.src = URL.createObjectURL(localVideoStream);
      peerConn.addStream(localVideoStream);
      createAndSendOffer();
    },
    function(error) {
      console.log(error);
    },
  );
}

function answerCall() {
  prepareCall();
  navigator.getUserMedia(
    { audio: true, video: true },
    function(stream) {
      localVideoStream = stream;
      localVideo.src = URL.createObjectURL(localVideoStream);
      peerConn.addStream(localVideoStream);
      createAndSendAnswer();
    },
    function(error) {
      console.log(error);
    },
  );
}

function endCall() {
  peerConn.close();
  localVideoStream.getTracks().forEach(function(track) {
    track.stop();
  });
  localVideo.src = '';
  remoteVideo.src = '';
  videoCallButton.removeAttribute('disabled');
  endCallButton.setAttribute('disabled', true);
}

function pageReady() {
  videoCallButton = document.getElementById('videoCallButton');
  endCallButton = document.getElementById('endCallButton');
  localVideo = document.getElementById('localVideo');
  remoteVideo = document.getElementById('remoteVideo');
  if (navigator.getUserMedia) {
    videoCallButton.removeAttribute('disabled');
    videoCallButton.addEventListener('click', initiateCall);
    endCallButton.addEventListener('click', function(e) {
      wsc.send(JSON.stringify({ closeConnection: true }));
      endCall();
    });
  } else {
    alert('Sorry Your Browser Doesnot Support WebRTC');
  }
}

wsc.onmessage = function(e) {
  var signal = JSON.parse(e.data);
  console.log(signal);
  if (!peerConn) answerCall();

  if (signal.sdp) {
    peerConn.setRemoteDescription(new RTCSessionDescription(signal.sdp));
  } else if (signal.candidate) {
    peerConn.addIceCandidate(new RTCIceCandidate(signal.candidate));
  } else if (signal.closeConnection) {
    endCall();
  }
};
