(function(root, factory)
{
	if (typeof define === 'function' && define.amd)
	{
		define(['module', 'angular'], function(module, angular)
		{
			module.exports = factory(angular);
		});
	}
	else if (typeof module === 'object')
	{
		module.exports = factory(require('angular'));
	}
	else
	{
		if (!root.mp)
		{
			root.mp = {};
		}

		root.mp.datePicker = factory(root.angular);
	}
}(this, function(angular)
{
	'use strict';

	return angular.module('mp.datePicker', []).directive('datePicker', ['$window', '$locale', '$mdDialog',
    function($window, $locale, $mdDialog)
		{
			// Introduce custom elements for IE8
			$window.document.createElement('date-picker');

			return {
				restrict: 'AE',
				templateUrl: 'components/directives/_coCalendar.html',
				require: '?ngModel',
				scope:
				{
					onDateSelected: '&',
					onBlockDaySelected: '&',
					formatDate: '=', // @todo breaking change: change to & to allow use of date filter directly
					parseDate: '=', // @todo change to &
					dialog: '=',
					ngModel: '=',
					placeHolder: '@',
					blockDates: '=',
					clearDate: '=',
					disable: '=',
					dispFutura: '=',
					dispFuturaAlert: '&'
				},

				link: function($scope, $element, $attributes, ngModel)
				{
					var selectedDate = new Date(),
						days = [], // Slices of this are used for ngRepeat
						months = [],
						daysOfWeek = [],
						firstDayOfWeek = $locale.DATETIME_FORMATS.FIRSTDAYOFWEEK || 0,
						now = new Date(),
						viewed = false;

					$scope.currentMonth = $locale.DATETIME_FORMATS.MONTH[selectedDate.getMonth()];
					$scope.currentYear = selectedDate.getFullYear();
					$scope.currentDate = selectedDate.getDate();
					$scope.currentDay = $locale.DATETIME_FORMATS.DAY[(selectedDate.getDay() + firstDayOfWeek) % 7];
					$scope.previousMonth = -1;
					$scope.nextMonth = 1;
					if($scope.dispFutura != undefined)
					{
						$scope.dispDataFutura = new Date();
						$scope.dispDataFutura.setDate(now.getDate() + $scope.dispFutura);
					}


					$scope.getTemplate = function()
					{
						if ($scope.dialog)
							return 'components/directives/_cotemplateCalendarDialog.html';
						else
							return 'components/directives/_cotemplateCalendar.html';
					};


					for (var i = 1; i <= 31; i++)
					{
						days.push(i);
					}


					for (var i = 0; i < 12; i++)
					{
						months.push(
						{
							fullName: $locale.DATETIME_FORMATS.MONTH[i],
							shortName: $locale.DATETIME_FORMATS.SHORTMONTH[i]
						});
					}


					for (var i = 0; i < 7; i++)
					{
						var day = $locale.DATETIME_FORMATS.DAY[(i + firstDayOfWeek) % 7];

						daysOfWeek.push(
						{
							fullName: day,
							firstLetter: day.substr(0, 1)
						});
					}


					$scope.months = months;
					$scope.daysOfWeek = daysOfWeek;

					function setYearAndMonth(date)
					{
						$scope.year = date.getFullYear();
						$scope.month = date.getMonth();

						var firstDayOfMonth = new Date($scope.year, $scope.month, 1),
							lastDayOfMonth = new Date($scope.year, $scope.month + 1, 0),
							lastDayOfPreviousMonth = new Date($scope.year, $scope.month, 0),
							daysInMonth = lastDayOfMonth.getDate(),
							daysInLastMonth = lastDayOfPreviousMonth.getDate(),
							dayOfWeek = firstDayOfMonth.getDay(),
							leadingDays = (dayOfWeek - firstDayOfWeek + 7) % 7 || 7; // Ensure there are always leading days to give context

						$scope.today = now.getFullYear() === $scope.year && now.getMonth() === $scope.month ? now.getDate() : null;

						$scope.selectedDay = selectedDate && selectedDate.getFullYear() === $scope.year && selectedDate.getMonth() === $scope.month ? selectedDate.getDate() : null;

						$scope.leadingDays = days.slice(-leadingDays - (31 - daysInLastMonth), daysInLastMonth);

						$scope.days = days.slice(0, daysInMonth);

						$scope.firstDayOfMonthIsSunday = dayOfWeek == 0 ? false : true;

						$scope.trailingDays = days.slice(0, 6 * 7 - (leadingDays + daysInMonth));

						$scope.daysObject = [];
						for (var i = 0; i < $scope.days.length; i++)
						{
							var currentDate = new Date($scope.year, $scope.month, days[i]);
							var aux = {
								blockDate: false,
								dispFutura: false,
								days: 0
							};

							if ($scope.blockDates != undefined || $scope.dispFutura != undefined)
							{
								if($scope.dispDataFutura != undefined && currentDate >= $scope.dispDataFutura)
								{
									aux.dispFutura = true;
								}
								else
								{
									for (var j = 0; j < $scope.blockDates.length; j++)
									{
										var dateBlockInicio = new Date($scope.blockDates[j].dataInicio);
										var dateBlockFim = new Date($scope.blockDates[j].dataFim);
										if (((dateBlockInicio.getDate() <= currentDate.getDate()) && (dateBlockInicio.getFullYear() <= currentDate.getFullYear()) && (dateBlockInicio.getMonth() <= currentDate.getMonth())) &&
											((dateBlockFim.getDate() >= currentDate.getDate()) && (dateBlockFim.getFullYear() >= currentDate.getFullYear()) && (dateBlockFim.getMonth() >= currentDate.getMonth())))
										{
											aux.blockDate = true;
										}
									}
								}
							}
							aux.days = $scope.days[i];
							$scope.daysObject.push(aux);
						}
					}



					// Default to current year and month
					setYearAndMonth(new Date());

					if (ngModel)
					{
						ngModel.$render = function()
						{
							selectedDate = ngModel.$viewValue ? $scope.parseDate ? $scope.parseDate(ngModel.$viewValue) : new Date(ngModel.$viewValue) : null;

							if (selectedDate && !isNaN(selectedDate))
							{
								setYearAndMonth(selectedDate);
							}
							else
							{
								// Bad input, stay on current year and month, but reset selected date
								$scope.selectedDay = null;
							}
						};
					}

					$scope.internalControl = $scope.clearDate ||
					{};
					$scope.internalControl.clear = function()
					{
						$scope.selectedDay = null;
					}


					$scope.changeMonthBy = function(amount)
					{
						var date = new Date($scope.year, $scope.month + amount, 1);
						if (!$scope.dialog)
						{
							if(date.getFullYear() === $scope.dispDataFutura.getFullYear() && date.getMonth() === $scope.dispDataFutura.getMonth() && !viewed)
							{
								$scope.dispFuturaAlert();
								viewed = true;
							}

							if (date.getFullYear() >= now.getFullYear())
							{
								if (date.getFullYear() > now.getFullYear())
								{
									if($scope.dispDataFutura != undefined && date <= $scope.dispDataFutura)
									{
										setYearAndMonth(date);
									}
									else if($scope.dispDataFutura === undefined)
									{
										setYearAndMonth(date);
									}
								}
								else if (date.getMonth() >= now.getMonth())
								{
									if($scope.dispDataFutura != undefined && date <= $scope.dispDataFutura)
									{
										setYearAndMonth(date);
									}
									else if($scope.dispDataFutura === undefined)
									{
										setYearAndMonth(date);
									}
								}
							}
						}
						else
						{
							setYearAndMonth(date);
						}
					};


					$scope.selectToday = function()
					{
						setYearAndMonth(now);
					};


					$scope.hideToday = function()
					{
						if ($scope.year >= now.getFullYear())
						{
							if ($scope.year > now.getFullYear())
								return true;
							else if ($scope.month > now.getMonth())
								return true;
							else
								return false;
						}
						else
						{
							return false;
						}
					};

					$scope.hideNext = function()
					{
						var date = new Date($scope.year, $scope.month, 1);
						if ($scope.year <= $scope.dispDataFutura.getFullYear())
						{
							if ($scope.year < $scope.dispDataFutura.getFullYear())
								return true;
							else if ($scope.month < $scope.dispDataFutura.getMonth())
								return true;
							else
								return false;
						}
						else
						{
							return false;
						}
					};


					$scope.showPicker = true;
					$scope.datePicker = function($event)
					{
						if ($scope.disable)
						{
							return;
						}
						$event.stopPropagation();
						$mdDialog.show(
						{
							targetEvent: $event,
							template: '<md-dialog class="co-dialog">' +
								'<div class="angular-date-picker-dialog md-body-1">' +
								'<div class="_current-day-week" layout="column" layout-align="center center">' +
								'<div class="_day" layout><span>{{ctrl.parent.currentDay}}</span></div>' +
								'</div>' +
								'<div class="_current-date" layout="column" layout-align="center center">' +
								'<div class="_month" layout><span>{{ctrl.parent.currentMonth}}</span></div>' +
								'<div class="_day md-display-3" layout><strong>{{ctrl.parent.currentDate}}</strong></div>' +
								'<div class="_year" layout><span>{{ctrl.parent.currentYear}}</span></div>' +
								'</div>' +
								'<div class="_month" layout="row" layout-align="center center">' +
								'<a href="" class="_previous" ng-click="ctrl.parent.changeMonthBy(ctrl.parent.previousMonth)">' +
								'<svg style="width:22px;height:22px" viewBox="0 0 22 22">' +
								'<path fill="#125176" d="M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z" />' +
								'</svg>' +
								'</a>' +
								'<span title="{{ ctrl.parent.months[ctrl.parent.month].fullName }}">{{ ctrl.parent.months[ctrl.parent.month].fullName }} {{ ctrl.parent.year }}</span>' +
								'<a href="" class="_next" ng-click="ctrl.parent.changeMonthBy(ctrl.parent.nextMonth)">' +
								'<svg style="width:22px;height:22px" viewBox="0 0 22 22">' +
								'<path fill="#125176" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />' +
								'</svg>' +
								'</a>' +
								'</div>' +
								'<div class="_days" ng-click="ctrl.parent.pickDay($event)">' +
								'<div class="_day-of-week md-caption" ng-repeat="dayOfWeek in ctrl.parent.daysOfWeek" title="{{ dayOfWeek.fullName }}"><span>{{ dayOfWeek.firstLetter }}</span></div>' +
								'<div class="_day -padding" ng-repeat="day in ctrl.parent.leadingDays">{{ day }}</div>' +
								'<div class="_day -selectable" ng-repeat="day in ctrl.parent.daysObject" ng-class="{ \'-selected\': (day.days === ctrl.parent.selectedDay), \'-today\': (day.days === ctrl.parent.today) }">{{ day.days }}</div>' +
								'<div class="_day -padding" ng-repeat="day in ctrl.parent.trailingDays">{{ day }}</div>' +
								'</div>' +
								'</div>' +
								'</md-dialog>',
							locals:
							{
								parent: $scope
							},
							controller: angular.noop,
							controllerAs: 'ctrl',
							bindToController: true,
							clickOutsideToClose: true
						});
					};


					$scope.closeDatePicker = function()
					{
						$mdDialog.hide();
					};


					$scope.pickDay = function(evt)
					{
						var target = angular.element(evt.target);

						if (target.hasClass('-selectable'))
						{
							var day = parseInt(target.text(), 10);

							$scope.selectedDay = day;
							selectedDate = new Date($scope.year, $scope.month, day);

							$scope.currentMonth = $locale.DATETIME_FORMATS.MONTH[$scope.month];
							$scope.currentYear = $scope.year;
							$scope.currentDate = day;
							$scope.currentDay = $locale.DATETIME_FORMATS.DAY[(selectedDate.getDay() + firstDayOfWeek) % 7];


							if (ngModel)
							{
								ngModel.$setViewValue(
									$scope.formatDate ? $scope.formatDate(selectedDate) : selectedDate.toLocaleDateString()
								);
							}
							if ($scope.dialog === true)
							{
								$mdDialog.cancel();
							}
							$scope.onDateSelected();
						}
						else if (target.hasClass('-blockDay'))
						{
							var day = parseInt(target.text(), 10);

							$scope.selectedDay = day;
							selectedDate = new Date($scope.year, $scope.month, day);

							if (ngModel)
							{
								ngModel.$setViewValue(
									$scope.formatDate ? $scope.formatDate(selectedDate) : selectedDate.toLocaleDateString()
								);
							}

							$scope.onBlockDaySelected();
						}
					};
				}
			};
    }
  ]);
}));
