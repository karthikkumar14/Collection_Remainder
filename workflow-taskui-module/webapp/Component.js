sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/wf/collection/workflowtaskuimodule/model/models",
    "sap/m/MessageToast"
  ],
  function(UIComponent, Device, models, MessageToast) {
    "use strict";

    return UIComponent.extend(
      "sap.wf.collection.workflowtaskuimodule.Component",
      {
        metadata: {
          manifest: "json"
        },

        /**
         * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
         * @public
         * @override
         */
        init: function() {
          // call the base component's init function
          UIComponent.prototype.init.apply(this, arguments);

          // enable routing
          this.getRouter().initialize();

          // set the device model
          this.setModel(models.createDeviceModel(), "device");

          var startupParameters = "";
			var taskModel = "";
			var taskId = "";
			try {
				startupParameters = this.getComponentData().startupParameters;
				taskModel = startupParameters.taskModel;
				taskId = taskModel.getData().InstanceID;
				var contextModel = new sap.ui.model.json.JSONModel(this._getWorkflowRuntimeBaseURL() + "/task-instances/" + taskId + "/context");
				contextModel.setDefaultBindingMode(sap.ui.model.BindingMode.TwoWay);
				this.setModel(contextModel);
				var that = this;
				var taskStatus = false;
				contextModel.attachRequestCompleted(function () {
					var payload=contextModel.getData();
					var payloadModel = new sap.ui.model.json.JSONModel();
					payloadModel.setData(payload);
					me.setModel(payloadModel,"payloadModel");
					var oPositiveAction = {
						sBtnTxt: "Approve",
						onBtnPressed: function (e) {
							var model = that.getModel();
							model.refresh(true);
							taskStatus = true;
							that._triggerComplete(taskId, taskStatus,
								jQuery.proxy(
									that._refreshTask, that));
						}
					};
					startupParameters.inboxAPI.addAction({
						action: oPositiveAction.sBtnTxt,
						label: oPositiveAction.sBtnTxt,
						type: "Accept"
							//Set the onClick function
					}, oPositiveAction.onBtnPressed);

					// Implementation for Reject button action
					var oNegativeAction = {
						sBtnTxt: "Reject",
						onBtnPressed: function (e) {
							var model = that.getModel();
							model.refresh(true);
							//Call a local method to perform further action
							that._triggerComplete(taskId, taskStatus,
								jQuery.proxy(
									//on successful competion, call a local method to refresh the task list in My Inbox
									that._refreshTask, that));
						}
					};
					//Add 'Reject’ action to the task
					startupParameters.inboxAPI.addAction({
						action: oNegativeAction.sBtnTxt,
						label: oNegativeAction.sBtnTxt,
						type: "Reject"
							//Set the onClick function
					}, oNegativeAction.onBtnPressed);
				});
			} catch (err) {
				MessageToast.show(err);
			}
		},
		_fetchToken: function () {
			var token;
			$.ajax({
				url: this._getWorkflowRuntimeBaseURL() + "/xsrf-token",
				method: "GET",
				async: false,
				headers: {
					"X-CSRF-Token": "Fetch"
				},
				success: function (result, xhr, data) {
					token = data.getResponseHeader("X-CSRF-Token");
				}
			});
			return token;
		},
		_refreshTask: function () {
			var taskId = this.getComponentData().startupParameters.taskModel.getData().InstanceID;
			this.getComponentData().startupParameters.inboxAPI.updateTask("NA", taskId);
		},
		_triggerComplete: function (taskId, approvalStatus, refreshTask) {
			var token = this._fetchToken();
			var userDetails = this.getModel("userDetails").getData();
			var ApproverId = userDetails.EnterpriseID; // commented by guaue4 on 21.02.2020: New property for role assignment api
			var approverEmail = userDetails.email;

			var dataText, createdrequest = "";
			//form the context that will be updated - approval status and the equipment list
			if (approvalStatus) {

				dataText = "{ \"status\":\"COMPLETED\",\"context\": {\"approvalstatus\": \"" + approvalStatus + "\" ,\"ApproverId\": \"" +
					ApproverId + "\" ,\"createdrequest\": \"" + createdrequest + "\" , \"payloadWF\": {  \"ApproverId\" : \"" + ApproverId +
					"\",\"currentDate\" : \"" + currentDate +
					"\",\"approverEmail\" : \"" + approverEmail + "\"  } }}";

			} else {
				dataText = "{ \"status\":\"COMPLETED\",\"context\": {\"approvalstatus\": \"" + approvalStatus + "\" ,\"ApproverId\": \"" +
					ApproverId + "\" ,\"createdrequest\": \"" + createdrequest + "\" , \"payloadWF\": {  \"ApproverId\" : \"" + ApproverId +
					"\",\"currentDate\" : \"" + currentDate +
					"\",\"approverEmail\" : \"" + approverEmail + "\"  } }}";
			}
			$.ajax({
				//Call workflow API to complete the task
				url: this._getWorkflowRuntimeBaseURL() + "/task-instances/" + taskId,
				method: "PATCH",
				contentType: "application/json",
				//pass the updated context to the API
				data: dataText,
				headers: {
					//pass the xsrf token retrieved earlier
					"X-CSRF-Token": token
				},
				//refreshTask needs to be called on successful completion
				success: refreshTask
			});
			MessageToast.show("Action completed");
        },
        _getWorkflowRuntimeBaseURL: function() {
          var appId = this.getManifestEntry("/sap.app/id");
          var appPath = appId.replaceAll(".", "/");
          var appModulePath = jQuery.sap.getModulePath(appPath);

          return appModulePath + "/bpmworkflowruntime/v1";
        }
	});
});