function submitToGoogleForm(url, successMsg) {
  var err = false, errMsg = "";
  
  url += "?";
  var inputs = document.getElementsByTagName("input");
  for (var i = 0; i < inputs.length; i++) {
    var input = inputs[i];
    if (input.type != "submit") {
      if (input.type == "text") {
	if (input.value == "" && !input.dataset.optional) {
	  err = true; errMsg = "Please fill in all fields."
	}
      }
      url += input.name + "=" + encodeURIComponent(input.value) + "&";
    }
  }
  var selects = document.getElementsByTagName("select");
  for (var i = 0; i < selects.length; i++) {
    var select = selects[i];
    url += select.name + "=" +
      encodeURIComponent(select.options[select.selectedIndex].text) + "&";
  }
  var textareas = document.getElementsByTagName("textarea");
  for (var i = 0; i < textareas.length; i++) {
    var textarea = textareas[i];
    if (textarea.value == "" && !textarea.dataset.optional) {
      err = true; errMsg = "Please fill in all fields."
    }
    url += textarea.name + "=" + encodeURIComponent(textarea.value) + "&";
  }
  
  url += "ifq&submit=Submit";
//  window.location = url;

  var status = document.getElementById("status");
  if (err) {
    status.innerHTML = errMsg;
    status.style.color = "red";
  } else {
    var iframe = document.createElement("iframe");  
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.style.visibility = "hidden";
    iframe.style.width = 1;
    iframe.style.height = 1;
    iframe.style.position = "absolute";

    status.innerHTML = successMsg;
    status.style.color = "green";
    
    // clear input elements
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      if (input.type == "text")
	input.value = "";
    }
    for (var i = 0; i < textareas.length; i++) {
      var textarea = textareas[i];
      textarea.value = "";
    }
  }
}
