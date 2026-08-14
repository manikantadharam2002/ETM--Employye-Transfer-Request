sap.ui.define(
    [
        "sap/ui/core/UIComponent",
        "sap/ui/Device",
        "app/workflowuimodule/model/models"
    ],
    function (
        UIComponent,
        Device,
        models
    ) {
        "use strict";

        return UIComponent.extend(
            "app.workflowuimodule.Component",
            {

                metadata: {
                    manifest: "json"
                },

                /**
                 * Component initialization
                 */
                init: function () {

                    // =====================================================
                    // 1. Call base component initialization
                    // =====================================================

                    UIComponent.prototype.init.apply(
                        this,
                        arguments
                    );


                    // =====================================================
                    // 2. Initialize routing
                    // =====================================================

                    this.getRouter().initialize();


                    // =====================================================
                    // 3. Set device model
                    // =====================================================

                    this.setModel(
                        models.createDeviceModel(),
                        "device"
                    );


                    // =====================================================
                    // 4. Set BPA task and context models
                    // =====================================================

                    this.setTaskModels();


                    // =====================================================
                    // 5. REJECT ACTION
                    // =====================================================

                    const rejectOutcomeId = "reject";

                    this.getInboxAPI().addAction(
                        {
                            action: rejectOutcomeId,
                            label: "Reject",
                            type: "reject"
                        },

                        function () {

                            this.completeTask(
                                false,
                                rejectOutcomeId
                            );

                        },

                        this
                    );


                    // =====================================================
                    // 6. APPROVE ACTION
                    // =====================================================

                    const approveOutcomeId = "approve";

                    this.getInboxAPI().addAction(
                        {
                            action: approveOutcomeId,
                            label: "Approve",
                            type: "accept"
                        },

                        function () {

                            this.completeTask(
                                true,
                                approveOutcomeId
                            );

                        },

                        this
                    );

                },


                // =========================================================
                // SET BPA TASK AND CONTEXT MODELS
                // =========================================================

                setTaskModels: function () {

                    var componentData =
                        this.getComponentData();

                    var startupParameters =
                        componentData.startupParameters;


                    // -----------------------------------------------------
                    // Task model
                    // -----------------------------------------------------

                    this.setModel(
                        startupParameters.taskModel,
                        "task"
                    );


                    // -----------------------------------------------------
                    // Task context model
                    // -----------------------------------------------------

                    var taskContextModel =
                        new sap.ui.model.json.JSONModel(
                            this._getTaskInstancesBaseURL() +
                            "/context"
                        );


                    this.setModel(
                        taskContextModel,
                        "context"
                    );

                },


                // =========================================================
                // GET TASK INSTANCE BASE URL
                // =========================================================

                _getTaskInstancesBaseURL: function () {

                    return (
                        this._getWorkflowRuntimeBaseURL() +
                        "/task-instances/" +
                        this.getTaskInstanceID()
                    );

                },


                // =========================================================
                // GET BPA WORKFLOW RUNTIME BASE URL
                // =========================================================

                _getWorkflowRuntimeBaseURL: function () {

                    var ui5CloudService =
                        this.getManifestEntry(
                            "/sap.cloud/service"
                        ).replaceAll(".", "");


                    var ui5ApplicationName =
                        this.getManifestEntry(
                            "/sap.app/id"
                        ).replaceAll(".", "");


                    var appPath =
                        `${ui5CloudService}.${ui5ApplicationName}`;


                    return (
                        `/${appPath}/api/public/workflow/rest/v1`
                    );

                },


                // =========================================================
                // GET CURRENT TASK INSTANCE ID
                // =========================================================

                getTaskInstanceID: function () {

                    return this
                        .getModel("task")
                        .getData()
                        .InstanceID;

                },


                // =========================================================
                // GET BPA INBOX API
                // =========================================================

                getInboxAPI: function () {

                    var startupParameters =
                        this
                            .getComponentData()
                            .startupParameters;


                    return startupParameters.inboxAPI;

                },


                // =========================================================
                // COMPLETE BPA TASK
                // =========================================================

                completeTask: function (
                    approvalStatus,
                    outcomeId
                ) {

                    // -----------------------------------------------------
                    // Store approval status in BPA context
                    // -----------------------------------------------------

                    this.getModel("context").setProperty(
                        "/approved",
                        approvalStatus
                    );


                    // -----------------------------------------------------
                    // Complete task with selected outcome
                    // -----------------------------------------------------

                    this._patchTaskInstance(
                        outcomeId
                    );

                },


                // =========================================================
                // PATCH TASK INSTANCE
                // =========================================================

                _patchTaskInstance: function (
                    outcomeId
                ) {

                    // -----------------------------------------------------
                    // Get current BPA context
                    // -----------------------------------------------------

                    const context =
                        this
                            .getModel("context")
                            .getData();


                    // -----------------------------------------------------
                    // Prepare task completion payload
                    // -----------------------------------------------------

                    var data = {

                        // Complete BPA task
                        status: "COMPLETED",

                        // Send complete context back to BPA
                        context: {
                            ...context,

                            // Make sure comment is always available
                            comment: context.comment || ""
                        },

                        // Send selected BPA outcome
                        decision: outcomeId

                    };


                    // -----------------------------------------------------
                    // PATCH BPA task
                    // -----------------------------------------------------

                    jQuery.ajax(
                        {
                            url:
                                this._getTaskInstancesBaseURL(),

                            method: "PATCH",

                            contentType:
                                "application/json",

                            async: true,

                            data:
                                JSON.stringify(data),

                            headers: {
                                "X-CSRF-Token":
                                    this._fetchToken()
                            }

                        }
                    )

                    // -----------------------------------------------------
                    // Execute only after successful PATCH
                    // -----------------------------------------------------

                    .done(
                        function () {

                            this._refreshTaskList();

                        }.bind(this)
                    );

                },


                // =========================================================
                // FETCH CSRF TOKEN
                // =========================================================

                _fetchToken: function () {

                    var fetchedToken;


                    jQuery.ajax(
                        {
                            url:
                                this._getWorkflowRuntimeBaseURL() +
                                "/xsrf-token",

                            method: "GET",

                            async: false,

                            headers: {
                                "X-CSRF-Token": "Fetch"
                            },

                            success:
                                function (
                                    result,
                                    xhr,
                                    data
                                ) {

                                    fetchedToken =
                                        data.getResponseHeader(
                                            "X-CSRF-Token"
                                        );

                                }

                        }
                    );


                    return fetchedToken;

                },


                // =========================================================
                // REFRESH BPA INBOX
                // =========================================================

                _refreshTaskList: function () {

                    this
                        .getInboxAPI()
                        .updateTask(
                            "NA",
                            this.getTaskInstanceID()
                        );

                }

            }
        );
    }
);