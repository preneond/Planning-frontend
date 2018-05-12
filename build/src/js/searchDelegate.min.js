class SearchDelegate {
  constructor() {
    _enableAutoCompletion()
    _enableMapInteraction()
  }

  _enableAutoCompletion() {
      new AutoComplete(document.getElementById('originInput'));
      new AutoComplete(document.getElementById('destinationInput'));
  }


  planRoute()
}
